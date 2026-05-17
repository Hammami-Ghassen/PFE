package com.sante.app.controller.chat;

import com.sante.app.dto.response.ApiResponse;
import com.sante.app.model.chat.ChatAttachment;
import com.sante.app.repository.chat.ChatAttachmentRepository;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat/files")
@RequiredArgsConstructor
public class ChatFileController {

    private final ChatAttachmentRepository chatAttachmentRepository;
    private final Path uploadDir = Paths.get("uploads", "chat");

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("pdf", "jpg", "jpeg", "png", "docx", "csv", "xlsx", "xls");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    @PostMapping("/upload")
    public ApiResponse<Long> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Cannot upload empty file");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File size exceeds 5MB limit");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Invalid file format. Allowed formats: " + ALLOWED_EXTENSIONS);
        }

        try {
            Path absoluteUploadDir = uploadDir.toAbsolutePath();
            if (!Files.exists(absoluteUploadDir)) {
                Files.createDirectories(absoluteUploadDir);
            }

            String newFileName = UUID.randomUUID() + "." + extension;
            Path filePath = absoluteUploadDir.resolve(newFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            ChatAttachment attachment = ChatAttachment.builder()
                    .fileName(originalFilename)
                    .fileType(file.getContentType())
                    .fileSize(file.getSize())
                    .filePath(filePath.toString())
                    .build();

            attachment = chatAttachmentRepository.save(attachment);

            return ApiResponse.success("File uploaded successfully", attachment.getId());
        } catch (IOException e) {
            throw new RuntimeException("Could not store file", e);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        ChatAttachment attachment = chatAttachmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        try {
            Path filePath = Paths.get(attachment.getFilePath()).normalize();
            Path allowedDir = uploadDir.toAbsolutePath().normalize();
            if (!filePath.startsWith(allowedDir)) {
                throw new BadRequestException("Invalid file path");
            }

            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                String safeFileName = attachment.getFileName().replaceAll("[\"\\r\\n]", "_");
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(attachment.getFileType() != null ? attachment.getFileType() : "application/octet-stream"))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeFileName + "\"")
                        .body(resource);
            } else {
                throw new ResourceNotFoundException("File not found or not readable");
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Malformed URL", e);
        }
    }
}

