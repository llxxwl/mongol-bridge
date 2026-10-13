package com.mongolbridge;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;

// 集中处理 Controller 请求中的异常，统一返回 HTTP 状态码和 JSON 错误信息。
@RestControllerAdvice
public class ApiExceptionHandler {
    // 文件或整个请求超过 multipart 配置上限时，框架会抛出此异常。
    // ResponseEntity 同时指定 HTTP 状态码和响应体；413 表示请求内容过大。
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> tooLarge() {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ApiError("FILE_TOO_LARGE", "Recording must be no larger than 2 MB"));
    }

    // 文件表单没有名为 file 的部分时返回 400，常见原因是前后端字段名不一致。
    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiError> missingFile() {
        return ResponseEntity.badRequest().body(new ApiError("MISSING_FILE", "A file part named file is required"));
    }

    // 接收 Controller 主动抛出的异常，例如空录音，沿用异常指定的 HTTP 状态码。
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> invalidRecording(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(new ApiError("INVALID_RECORDING", exception.getReason()));
    }

    // code 便于程序判断错误类型，message 是简短描述；不返回服务器内部堆栈。
    public record ApiError(String code, String message) {}
}
