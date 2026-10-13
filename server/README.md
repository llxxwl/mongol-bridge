# MongolBridge backend

Java 21 + Spring Boot + Maven Wrapper. This local development prototype receives
recordings without saving them permanently. Speech recognition and translation
are not connected. A successful upload is not a successful translation.

## Run on Windows

Open PowerShell in this directory:

```powershell
java -version
.\mvnw.cmd spring-boot:run
```

The first run downloads Maven and dependencies. No separate Maven installation
is required. JAVA_HOME should point to the JDK directory, not its bin directory.
Stop with Ctrl+C. In IntelliJ IDEA, open pom.xml as a project, select JDK 21,
and run MongolBridgeApplication.

Health URL: http://127.0.0.1:8080/api/health

## Mini program on the same computer

The mini program's utils/config.js uses http://127.0.0.1:8080.
In WeChat DevTools, under Details / Local Settings, enable the option to skip
request domain, TLS and HTTPS certificate validation for local development.
Compile, record, stop, then choose upload. A successful request shows that the
recording was received while translation remains unavailable.

## Phone debugging

127.0.0.1 on a phone refers to the phone, not the computer. Use the same Wi-Fi
and set utils/config.js baseUrl to the computer's LAN IPv4 address.
Restart the server with:

```powershell
$env:SERVER_ADDRESS = '0.0.0.0'
.\mvnw.cmd spring-boot:run
```

Allow the chosen port on the Windows private-network firewall if prompted.
Use WeChat's real-device debugging / development debug mode; ordinary preview
may still enforce HTTPS and legal-domain restrictions. Opening /api/health
in the phone's browser can confirm basic LAN connectivity.

This is a local prototype with no login or quota enforcement. Before publishing,
add access controls, HTTPS, registered request/upload domains, and configure
WeChat's privacy declarations for recording and transmission.

## API

- GET /api/health: returns status UP.
- POST /api/recordings: multipart/form-data with a file part named file.
- Maximum file size: 2 MiB. Empty or missing files return 400; oversize returns 413.
- Success: status RECEIVED, requestId, sizeBytes, stored false,
  translationAvailable false, translation null.

The endpoint validates transport size, not audio content or language. No model
API key is needed yet. Servlet multipart processing may use temporary files;
the application does not retain recordings or log their contents.

```powershell
curl.exe -F "file=@C:\path\recording.mp3" http://127.0.0.1:8080/api/recordings
.\mvnw.cmd test
.\mvnw.cmd package
```

If port 8080 is occupied, set SERVER_PORT to another port and update baseUrl.
