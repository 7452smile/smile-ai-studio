> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Create video from text - RunWay Gen 4.5

> Generate high-quality videos from text descriptions using RunWay Gen 4.5 model.

**Features:**
- State-of-the-art text-to-video generation
- Multiple aspect ratios for different use cases
- Duration options: 5, 8, or 10 seconds
- High visual fidelity and motion quality

**Supported aspect ratios:**
- `1280:720`: Landscape (16:9) - ideal for YouTube, presentations
- `720:1280`: Portrait (9:16) - ideal for TikTok, Instagram Reels
- `1104:832`: Landscape (4:3) - classic format
- `960:960`: Square (1:1) - ideal for Instagram posts
- `832:1104`: Portrait (3:4) - ideal for Pinterest

**Use cases:** Social media content, marketing videos, creative projects, and visual storytelling.




## OpenAPI

````yaml post /v1/ai/text-to-video/runway-4-5
openapi: 3.0.0
info:
  description: >-
    The Freepik API is your gateway to a vast collection of high-quality digital
    resources for your applications and projects. As a leading platform, it
    offers a wide range of graphics, including vectors, photos, illustrations,
    icons, PSD templates, and more, all curated by talented designers from
    around the world.
  title: Freepik API
  version: 1.0.0
servers:
  - description: B2B API Production V1
    url: https://api.freepik.com
security:
  - apiKey: []
paths:
  /v1/ai/text-to-video/runway-4-5:
    post:
      tags:
        - text-to-video
      summary: Create video from text - RunWay Gen 4.5
      description: >
        Generate high-quality videos from text descriptions using RunWay Gen 4.5
        model.


        **Features:**

        - State-of-the-art text-to-video generation

        - Multiple aspect ratios for different use cases

        - Duration options: 5, 8, or 10 seconds

        - High visual fidelity and motion quality


        **Supported aspect ratios:**

        - `1280:720`: Landscape (16:9) - ideal for YouTube, presentations

        - `720:1280`: Portrait (9:16) - ideal for TikTok, Instagram Reels

        - `1104:832`: Landscape (4:3) - classic format

        - `960:960`: Square (1:1) - ideal for Instagram posts

        - `832:1104`: Portrait (3:4) - ideal for Pinterest


        **Use cases:** Social media content, marketing videos, creative
        projects, and visual storytelling.
      operationId: create_video_runway_45_t2v
      requestBody:
        content:
          application/json:
            examples:
              all-params:
                $ref: '#/components/examples/request-runway-4-5-t2v-all-params'
              required-only:
                $ref: '#/components/examples/request-runway-4-5-t2v-required-params'
            schema:
              $ref: '#/components/schemas/t2v-request'
        required: true
      responses:
        '200':
          content:
            application/json:
              examples:
                success - created task:
                  $ref: '#/components/examples/200-task-created'
                success - in progress task:
                  $ref: '#/components/examples/200-task-in-progress'
                success - completed task:
                  $ref: '#/components/examples/200-task-completed'
                success - failed task:
                  $ref: '#/components/examples/200-task-failed'
              schema:
                $ref: >-
                  #/components/schemas/_v1_ai_text_to_image_hyperflux_post_200_response
          description: OK - The task exists and the status is returned
        '400':
          content:
            application/json:
              examples:
                invalid_page:
                  summary: Parameter 'page' is not valid
                  value:
                    message: Parameter 'page' must be greater than 0
                invalid_query:
                  summary: Parameter 'query' is not valid
                  value:
                    message: Parameter 'query' must not be empty
                invalid_filter:
                  summary: Parameter 'filter' is not valid
                  value:
                    message: Parameter 'filter' is not valid
                generic_bad_request:
                  summary: Bad Request
                  value:
                    message: Parameter ':attribute' is not valid
              schema:
                $ref: '#/components/schemas/get_all_style_transfer_tasks_400_response'
            application/problem+json:
              examples:
                invalid_page:
                  summary: Parameter 'page' is not valid
                  value:
                    message: Your request parameters didn't validate.
                    invalid_params:
                      - name: page
                        reason: Parameter 'page' must be greater than 0
                      - name: per_page
                        reason: Parameter 'per_page' must be greater than 0
              schema:
                $ref: >-
                  #/components/schemas/get_all_style_transfer_tasks_400_response_1
          description: >-
            Bad Request - The server could not understand the request due to
            invalid syntax.
        '401':
          content:
            application/json:
              examples:
                invalid_api_key:
                  summary: API key is not valid
                  value:
                    message: Invalid API key
                missing_api_key:
                  summary: API key is not provided
                  value:
                    message: Missing API key
              schema:
                $ref: '#/components/schemas/get_all_style_transfer_tasks_400_response'
          description: >-
            Unauthorized - The client must authenticate itself to get the
            requested response.
        '500':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/get_all_style_transfer_tasks_500_response'
          description: >-
            Internal Server Error - The server has encountered a situation it
            doesn't know how to handle.
        '503':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/get_all_style_transfer_tasks_503_response'
          description: Service Unavailable
components:
  examples:
    request-runway-4-5-t2v-all-params:
      summary: Request - Generate video from text using RunWay Gen 4.5 (all parameters)
      value:
        prompt: >-
          A majestic eagle soaring over snow-capped mountains at golden hour,
          cinematic lighting
        ratio: '1280:720'
        duration: 10
        webhook_url: https://example.com/webhook
    request-runway-4-5-t2v-required-params:
      summary: Request - Generate video from text using RunWay Gen 4.5 (required only)
      value:
        prompt: A serene ocean wave crashing on a sandy beach at sunset
    200-task-created:
      summary: Success - Task created
      value:
        data:
          generated: []
          task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
          status: CREATED
    200-task-in-progress:
      summary: Success - Task in progress
      value:
        data:
          generated: []
          task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
          status: IN_PROGRESS
    200-task-completed:
      summary: Success - Task completed
      value:
        data:
          generated:
            - https://ai-statics.freepik.com/completed_task_image.jpg
          task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
          status: COMPLETED
    200-task-failed:
      summary: Success - Task failed
      value:
        data:
          generated: []
          task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
          status: FAILED
  schemas:
    t2v-request:
      properties:
        webhook_url:
          description: Webhook URL to notify when the task is completed
          format: uri
          type: string
        prompt:
          description: >-
            Text prompt describing the video to generate. Maximum 2000
            characters.
          example: A majestic eagle soaring over snow-capped mountains at golden hour
          maxLength: 2000
          type: string
        ratio:
          $ref: '#/components/schemas/aspect-ratio_1'
        duration:
          $ref: '#/components/schemas/duration'
      required:
        - prompt
      type: object
    _v1_ai_text_to_image_hyperflux_post_200_response:
      example:
        data:
          generated:
            - https://openapi-generator.tech
            - https://openapi-generator.tech
          task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
          status: CREATED
      properties:
        data:
          $ref: '#/components/schemas/task-detail_1'
      required:
        - data
      type: object
    get_all_style_transfer_tasks_400_response:
      example:
        message: message
      properties:
        message:
          type: string
      type: object
    get_all_style_transfer_tasks_400_response_1:
      properties:
        problem:
          $ref: >-
            #/components/schemas/get_all_style_transfer_tasks_400_response_1_problem
      type: object
    get_all_style_transfer_tasks_500_response:
      example:
        message: Internal Server Error
      properties:
        message:
          example: Internal Server Error
          type: string
      type: object
    get_all_style_transfer_tasks_503_response:
      example:
        message: Service Unavailable. Please try again later.
      properties:
        message:
          example: Service Unavailable. Please try again later.
          type: string
      type: object
    aspect-ratio_1:
      default: '1280:720'
      description: |
        Aspect ratio of the generated video.
        - `1280:720`: Landscape (16:9)
        - `720:1280`: Portrait (9:16)
        - `1104:832`: Landscape (4:3)
        - `960:960`: Square (1:1)
        - `832:1104`: Portrait (3:4)
      enum:
        - '1280:720'
        - '720:1280'
        - '1104:832'
        - '960:960'
        - '832:1104'
      type: string
    duration:
      default: 5
      description: Duration of the generated video in seconds (5, 8, or 10).
      enum:
        - 5
        - 8
        - 10
      type: integer
    task-detail_1:
      allOf:
        - $ref: '#/components/schemas/task'
        - properties:
            generated:
              items:
                description: URL of the generated image
                format: uri
                type: string
              type: array
          required:
            - generated
          type: object
      example:
        generated:
          - https://openapi-generator.tech
          - https://openapi-generator.tech
        task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
        status: CREATED
    get_all_style_transfer_tasks_400_response_1_problem:
      properties:
        message:
          example: Your request parameters didn't validate.
          type: string
        invalid_params:
          items:
            $ref: >-
              #/components/schemas/get_all_style_transfer_tasks_400_response_1_problem_invalid_params_inner
          type: array
      required:
        - invalid_params
        - message
      type: object
    task:
      example:
        task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
        status: CREATED
      properties:
        task_id:
          description: Task identifier
          format: uuid
          type: string
        status:
          description: Task status
          enum:
            - CREATED
            - IN_PROGRESS
            - COMPLETED
            - FAILED
          type: string
      required:
        - status
        - task_id
      type: object
    get_all_style_transfer_tasks_400_response_1_problem_invalid_params_inner:
      properties:
        name:
          example: page
          type: string
        reason:
          example: Parameter 'page' must be greater than 0
          type: string
      required:
        - name
        - reason
      type: object
  securitySchemes:
    apiKey:
      description: >
        Your Freepik API key. Required for authentication. [Learn how to obtain
        an API
        key](https://docs.freepik.com/authentication#obtaining-an-api-key)
      in: header
      name: x-freepik-api-key
      type: apiKey

````