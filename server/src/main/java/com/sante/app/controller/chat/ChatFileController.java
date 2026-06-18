package com.sante.app.controller.chat;

import com.sante.app.dto.response.ApiResponse;
import com.sante.app.model.chat.ChatAttachment;
import com.sante.app.repository.chat.ChatAttachmentRepository;
import com.sante.app.exception.BadRequestException;
import com.sante.app.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/chat/files")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('AGENT','DIRECTEUR')")
public class ChatFileController {

    private final ChatAttachmentRepository chatAttachmentRepository;

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
            ChatAttachment attachment = ChatAttachment.builder()
                    .fileName(originalFilename)
                    .fileType(file.getContentType() != null ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE)
                    .fileSize(file.getSize())
                    .content(file.getBytes())
                    .build();

            attachment = chatAttachmentRepository.save(attachment);

            return ApiResponse.success("File uploaded successfully", attachment.getId());
        } catch (IOException e) {
            throw new RuntimeException("Could not store file", e);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable Long id) {
        ChatAttachment attachment = chatAttachmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        byte[] content = attachment.getContent();
        if (content == null || content.length == 0) {
            throw new ResourceNotFoundException("File content not found");
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getFileType() != null ? attachment.getFileType() : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(attachment.getFileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Attachment-Filename", attachment.getFileName())
                .body(content);
    }
}
