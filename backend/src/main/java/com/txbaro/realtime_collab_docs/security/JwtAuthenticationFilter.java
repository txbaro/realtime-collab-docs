package com.txbaro.realtime_collab_docs.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;
    // Có thể xóa dòng khai báo UserDetailsService nếu bạn không dùng đến trong file này

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        String userEmail = null; // Bỏ 'final' để có thể gán giá trị an toàn trong khối try-catch

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        // TÍNH NĂNG MỚI: KIỂM TRA DANH SÁCH ĐEN TỪ REDIS
        if (Boolean.TRUE.equals(redisTemplate.hasKey("BLACKLIST:" + jwt))) {
            // Nếu Token nằm trong danh sách đen, chặn lại không cho đi tiếp
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Token da bi vo hieu hoa (Logged out)");
            return;
        }

        try {
            // Chỉ cần lấy email 1 lần bằng hàm của bạn (extractEmail hoặc extractUsername)
            userEmail = jwtUtil.extractEmail(jwt);

            // Nếu đọc được Email và SecurityContext (bộ nhớ tạm của Spring) đang trống
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                
                // Nếu Token hợp lệ
                if (jwtUtil.validateToken(jwt)) {
                    // Đóng dấu xác thực cho người dùng này
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userEmail, null, null); 
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    // Lưu thông tin đăng nhập vào hệ thống
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Token lỗi (hết hạn, sai chữ ký...) -> Bỏ qua, hệ thống sẽ tự chặn ở các API cần bảo mật
        }

        // Quét thẻ xong, cho phép request đi tiếp vào Controller
        filterChain.doFilter(request, response);
    }
}