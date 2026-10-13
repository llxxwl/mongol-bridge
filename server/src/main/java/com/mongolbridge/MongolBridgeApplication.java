package com.mongolbridge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// 开启 Spring Boot 自动配置，并扫描当前包及子包中的 Controller 等组件。
@SpringBootApplication
public class MongolBridgeApplication {
    // 程序入口：启动 Spring 容器和内置 HTTP 服务器，无需单独安装 Tomcat。
    public static void main(String[] args) {
        SpringApplication.run(MongolBridgeApplication.class, args);
    }
}
