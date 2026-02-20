> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# LTX Video 2.0 Pro - Create video from text

> Generate a video from text prompt using the LTX Video 2.0 Pro model.

**Features:**
- High-quality video generation with resolutions up to 4K (2160p)
- Duration options: 6, 8, or 10 seconds
- Optional synchronized audio generation
- Reproducible results with seed parameter




## OpenAPI

````yaml post /v1/ai/text-to-video/ltx-2-pro
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
  /v1/ai/text-to-video/ltx-2-pro:
    post:
      tags:
        - text-to-video
      summary: LTX Video 2.0 Pro - Create video from text
      description: |
        Generate a video from text prompt using the LTX Video 2.0 Pro model.

        **Features:**
        - High-quality video generation with resolutions up to 4K (2160p)
        - Duration options: 6, 8, or 10 seconds
        - Optional synchronized audio generation
        - Reproducible results with seed parameter
      operationId: create_video_ltx_2_pro_t2v
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ltx-2-pro-t2v-request'
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
  schemas:
    ltx-2-pro-t2v-request:
      allOf:
        - $ref: '#/components/schemas/ltx-2-base'
        - properties:
            resolution:
              $ref: '#/components/schemas/ltx-2-resolution'
            duration:
              $ref: '#/components/schemas/ltx-2-pro-duration'
            fps:
              $ref: '#/components/schemas/ltx-2-fps'
          type: object
      required:
        - prompt
      title: LTX Video 2.0 Pro Text-to-Video Request
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
    ltx-2-base:
      properties:
        webhook_url:
          description: Webhook URL to notify when the task is completed
          format: uri
          type: string
        prompt:
          description: >
            Text prompt describing the desired video content.


            **Tips:**

            - Be specific about scenes, subjects, and visual details

            - Describe motion and camera movements

            - Mention lighting and atmosphere


            **Example:** "A majestic eagle soaring through mountain valleys at
            sunset, camera slowly panning to follow the flight"
          example: A majestic eagle soaring through mountain valleys at sunset
          maxLength: 2000
          type: string
        generate_audio:
          default: false
          description: Whether to generate synchronized audio for the video
          example: false
          type: boolean
        seed:
          description: >-
            Random seed for reproducibility. Use the same seed with identical
            parameters for similar results.
          example: 12345
          maximum: 4294967295
          minimum: 0
          type: integer
      type: object
    ltx-2-resolution:
      default: 1080p
      description: Video resolution
      enum:
        - 1080p
        - 1440p
        - 2160p
      example: 1080p
      type: string
    ltx-2-pro-duration:
      default: 6
      description: Video duration in seconds. Pro model supports 6, 8, or 10 seconds.
      enum:
        - 6
        - 8
        - 10
      example: 6
      type: integer
    ltx-2-fps:
      default: 25
      description: |
        Frames per second for the generated video.
        **Note:** 50 FPS is only available for durations up to 10 seconds.
      enum:
        - 25
        - 50
      example: 25
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
  examples:
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