package com.txbaro.realtime_collab_docs.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateDocumentRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    private String title;

    private Map<String, Object> content;
}
