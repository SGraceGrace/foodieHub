package com.project.foodservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaginatedResponse<T> {
    private List<T> content;
    private int currentPage;
    private int totalPages;
    private long totalElements;
    private int pageSize;

    public static <T> PaginatedResponse<T> of(Page<T> page) {
        return new PaginatedResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.getSize()
        );
    }

    public static <T> PaginatedResponse<T> ofList(List<T> list, Pageable pageable) {
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        int total = list.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex   = Math.min(fromIndex + size, total);
        return new PaginatedResponse<>(
                list.subList(fromIndex, toIndex),
                page,
                (int) Math.ceil((double) total / size),
                total,
                size
        );
    }
}
