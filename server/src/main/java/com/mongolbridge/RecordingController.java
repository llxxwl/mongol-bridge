package com.mongolbridge;

import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

// 声明 HTTP 接口类；返回的 Java 对象由 Spring 序列化为 JSON，而不是 HTML 页面。
@RestController
// 类级公共路径，与方法路径拼接，例如 /api + /health = /api/health。
@RequestMapping("/api")
public class RecordingController {
    // GET 适合查询；此接口只检查本服务可访问，不检测识别或翻译服务。
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "mongol-bridge-server");
    }

    // POST 接收文件表单；consumes 限定请求类型为 multipart/form-data。
    // @RequestParam("file") 必须对应小程序 uploadFile 的 name: 'file'。
    // MultipartFile 由框架从请求中解析生成，不需要手动解析 HTTP 报文。
    @PostMapping(value = "/recordings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadReceipt upload(@RequestParam("file") MultipartFile file) {
        // 文件大小上限由配置控制；这里额外拒绝零字节文件，交给统一异常处理返回 400。
        if (file.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Recording must not be empty");
        }
        // UUID 为本次回执生成编号；getSize 的单位是字节，并不检查音频格式或语言。
        // 目前只确认文件已收到，不持久保存、不识别、不翻译，所以两个标记为 false，译文为 null。
        return new UploadReceipt("RECEIVED", UUID.randomUUID().toString(), file.getSize(), false, false, null);
    }

    // record 是 Java 的简洁数据载体，自动生成构造方法和访问方法。
    // 字段名成为响应 JSON 的键，小程序用 status 和 sizeBytes 判断接收是否成功。
    // stored: 是否持久保存；translationAvailable: 是否已有译文；translation: 译文内容。
    public record UploadReceipt(String status, String requestId, long sizeBytes,
                                boolean stored, boolean translationAvailable, String translation) {}
}
