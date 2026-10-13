package com.mongolbridge;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import static org.assertj.core.api.Assertions.assertThat;

// 启动真实 HTTP 测试服务器，随机端口避免与正在运行的 8080 服务冲突。
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RecordingApiTest {
    // Spring 注入测试客户端，自动连接上面的随机端口。
    @Autowired private TestRestTemplate http;

    // @Test 标记测试方法；assertThat 断言实际返回值是否符合预期。
    @Test void healthIsAvailable() {
        var response = http.getForEntity("/api/health", Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("UP");
    }

    // 合成字节仅验证文件传输，不代表可播放录音或蒙古语识别测试。
    @Test void uploadAcknowledgesBytesWithoutPretendingToTranslate() {
        var response = http.postForEntity("/api/recordings", multipart("file", new byte[128]), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("RECEIVED");
        assertThat(response.getBody().get("sizeBytes")).isEqualTo(128);
        assertThat(response.getBody().get("stored")).isEqualTo(false);
        assertThat(response.getBody().get("translationAvailable")).isEqualTo(false);
        assertThat(response.getBody().get("translation")).isNull();
    }

    @Test void emptyRecordingIsRejected() {
        var response = http.postForEntity("/api/recordings", multipart("file", new byte[0]), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test void missingFileIsRejected() {
        var response = http.postForEntity("/api/recordings", multipart("wrong", new byte[10]), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("MISSING_FILE");
    }

    // 超出 2 MiB 一个字节，验证框架层的大小限制确实通过 HTTP 生效。
    @Test void oversizedRecordingIsRejectedByTheHttpServer() {
        var response = http.postForEntity("/api/recordings", multipart("file", new byte[2 * 1024 * 1024 + 1]), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody().get("code")).isEqualTo("FILE_TOO_LARGE");
    }

    // 构造与小程序上传相同类型的文件表单；内存字节避免测试依赖本地真实录音。
    // var 让编译器推断类型；HttpEntity<?> 将请求头和请求体包装成一次请求。
    private HttpEntity<?> multipart(String field, byte[] data) {
        var body = new LinkedMultiValueMap<String, Object>();
        body.add(field, new ByteArrayResource(data) {
            // 给资源提供文件名，让客户端将它作为文件部分发送。
            @Override public String getFilename() { return "recording.mp3"; }
        });
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        return new HttpEntity<>(body, headers);
    }
}
