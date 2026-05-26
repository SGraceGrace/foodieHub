package com.project.orderservice.dto;

import lombok.Data;

@Data
public class MarkRatedRequest {
    /** Customer's rating for the driver (1-5). Optional — null when skipped or no driver. */
    private Integer driverRating;
}
