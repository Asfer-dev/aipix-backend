/**
 * AI Service Client
 * Communicates with Python FastAPI backend for AI/ML processing
 */

import axios, { AxiosInstance } from "axios";

export interface AIJobRequest {
  jobId: number;
  jobType: string;
  imageUrl: string;
  parameters?: Record<string, any>;
}

export interface AIJobResponse {
  success: boolean;
  jobId: number;
  resultUrl?: string;
  processingTimeMs: number;
  metadata?: Record<string, any>;
  error?: string;
  errorCode?: string;
}

export interface AIServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  queueLength: number;
  averageProcessingTimeMs: number;
}

class AIServiceClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || "http://localhost:8000";

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000, // 5 minutes timeout for AI processing
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.AI_SERVICE_API_KEY || "",
      },
    });
  }

  /**
   * Process an enhancement job (photo enhancement)
   */
  async processEnhancement(request: AIJobRequest): Promise<AIJobResponse> {
    try {
      const response = await this.client.post<AIJobResponse>(
        "/api/v1/enhance",
        {
          job_id: request.jobId,
          image_url: request.imageUrl,
          parameters: request.parameters || {},
        },
      );

      return response.data;
    } catch (error: any) {
      return this.handleError(error, request.jobId);
    }
  }

  /**
   * Process a virtual staging job
   */
  async processVirtualStaging(request: AIJobRequest): Promise<AIJobResponse> {
    try {
      const response = await this.client.post<AIJobResponse>(
        "/api/v1/virtual-staging",
        {
          job_id: request.jobId,
          image_url: request.imageUrl,
          parameters: request.parameters || {
            style: request.parameters?.style || "modern",
            room_type: request.parameters?.roomType || "living_room",
          },
        },
      );

      return response.data;
    } catch (error: any) {
      return this.handleError(error, request.jobId);
    }
  }

  /**
   * Generate ad copy using NLP
   */
  async generateAdCopy(request: {
    jobId: number;
    propertyData: {
      title: string;
      description?: string;
      bedrooms?: number;
      bathrooms?: number;
      price?: number;
      location?: string;
    };
    parameters?: {
      tone?: "professional" | "casual" | "luxury";
      length?: "short" | "medium" | "long";
      platform?: "facebook" | "instagram" | "website";
    };
  }): Promise<AIJobResponse> {
    try {
      const response = await this.client.post<AIJobResponse>(
        "/api/v1/generate-ad-copy",
        {
          job_id: request.jobId,
          property_data: request.propertyData,
          parameters: request.parameters || {},
        },
      );

      return response.data;
    } catch (error: any) {
      return this.handleError(error, request.jobId);
    }
  }

  /**
   * Remove background from image
   */
  async removeBackground(request: AIJobRequest): Promise<AIJobResponse> {
    try {
      const response = await this.client.post<AIJobResponse>(
        "/api/v1/remove-background",
        {
          job_id: request.jobId,
          image_url: request.imageUrl,
          parameters: request.parameters || {},
        },
      );

      return response.data;
    } catch (error: any) {
      return this.handleError(error, request.jobId);
    }
  }

  /**
   * Replace sky in image
   */
  async replaceSky(request: AIJobRequest): Promise<AIJobResponse> {
    try {
      const response = await this.client.post<AIJobResponse>(
        "/api/v1/replace-sky",
        {
          job_id: request.jobId,
          image_url: request.imageUrl,
          parameters: request.parameters || {
            sky_type: request.parameters?.skyType || "clear_blue",
          },
        },
      );

      return response.data;
    } catch (error: any) {
      return this.handleError(error, request.jobId);
    }
  }

  /**
   * Check AI service health
   */
  async checkHealth(): Promise<AIServiceHealth> {
    try {
      const response = await this.client.get<AIServiceHealth>("/health");
      return response.data;
    } catch (error) {
      return {
        status: "unhealthy",
        queueLength: 0,
        averageProcessingTimeMs: 0,
      };
    }
  }

  /**
   * Handle errors from AI service
   */
  private handleError(error: any, jobId: number): AIJobResponse {
    console.error(`AI Service Error for job ${jobId}:`, error.message);

    let errorCode = "AI_SERVICE_ERROR";
    let errorMessage = "Unknown error occurred";

    if (error.response) {
      // AI service returned an error response
      errorCode = error.response.data?.error_code || "AI_PROCESSING_ERROR";
      errorMessage = error.response.data?.error || error.message;
    } else if (error.code === "ECONNREFUSED") {
      errorCode = "AI_SERVICE_UNAVAILABLE";
      errorMessage = "AI service is not available";
    } else if (error.code === "ETIMEDOUT") {
      errorCode = "AI_SERVICE_TIMEOUT";
      errorMessage = "AI service request timed out";
    }

    return {
      success: false,
      jobId,
      processingTimeMs: 0,
      error: errorMessage,
      errorCode,
    };
  }

  /**
   * Route job to appropriate AI service based on job type
   */
  async processJob(
    jobType: string,
    request: AIJobRequest,
  ): Promise<AIJobResponse> {
    switch (jobType) {
      case "ENHANCEMENT":
        return this.processEnhancement(request);
      case "VIRTUAL_STAGING":
        return this.processVirtualStaging(request);
      case "BACKGROUND_REMOVAL":
        return this.removeBackground(request);
      case "SKY_REPLACEMENT":
        return this.replaceSky(request);
      case "AD_GENERATION":
        // For ad generation, we need property data instead of image
        throw new Error("AD_GENERATION requires special handling");
      default:
        throw new Error(`Unsupported job type: ${jobType}`);
    }
  }
}

// Export singleton instance
export const aiServiceClient = new AIServiceClient();
