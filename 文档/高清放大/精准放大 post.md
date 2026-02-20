> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Upscaler Precision V2 - Upscale image

> Upscales an image while adding new visual elements or details (V2).
This endpoint may modify the original image content based on the prompt and inferred context.




## OpenAPI

````yaml post /v1/ai/image-upscaler-precision-v2
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
  /v1/ai/image-upscaler-precision-v2:
    post:
      tags:
        - upscaler-precision
      summary: Upscaler Precision V2 - Upscale image
      description: >
        Upscales an image while adding new visual elements or details (V2).

        This endpoint may modify the original image content based on the prompt
        and inferred context.
      operationId: postAiImageUpscalerPrecisionV2
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/request-content_3'
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
      security:
        - apiKey: []
components:
  schemas:
    request-content_3:
      properties:
        image:
          description: >
            Source image to upscale. Accepts either:

            - A publicly accessible HTTPS URL pointing to the image

            - A base64-encoded image string


            This image will be enhanced with AI-powered upscaling technology
            that intelligently adds details and improves image quality while
            increasing resolution.
          type: string
        webhook_url:
          description: >
            Optional callback URL that will receive asynchronous notifications
            when the upscaling task completes.

            The webhook will be called with the task status and the upscaled
            image URL.
          format: uri
          type: string
        sharpen:
          default: 7
          description: >
            Image sharpness intensity control. Higher values increase edge
            definition and clarity in the upscaled image.

            Valid values range from 0 (no sharpening) to 100 (maximum
            sharpness). Default is 7.
          maximum: 100
          minimum: 0
          type: integer
        smart_grain:
          default: 7
          description: >
            Intelligent grain/texture enhancement for the upscaled image. Helps
            preserve natural film grain and texture detail.

            Higher values add more fine-grained texture to prevent the upscaled
            image from looking too smooth or artificial.

            Valid values range from 0 (no grain) to 100 (maximum grain). Default
            is 7.
          maximum: 100
          minimum: 0
          type: integer
        ultra_detail:
          default: 30
          description: >
            Ultra detail enhancement level for the image upscaling process. This
            parameter controls how much fine detail

            the AI adds to the upscaled image, such as textures, patterns, and
            micro-details.

            Higher values create more intricate details. Valid values range from
            0 to 100. Default is 30.
          maximum: 100
          minimum: 0
          type: integer
        flavor:
          $ref: '#/components/schemas/flavor'
        scale_factor:
          $ref: '#/components/schemas/request_content_3_scale_factor'
      required:
        - image
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
    flavor:
      description: >
        Image processing flavor that determines the upscaling style and
        optimization for different image types:

        - `sublime`: Optimized for artistic and illustrated images with smooth
        gradients and vibrant colors

        - `photo`: Optimized for photographic images, preserving natural colors
        and realistic details

        - `photo_denoiser`: Specialized for photos with noise reduction, ideal
        for low-light or grainy photographs
      enum:
        - sublime
        - photo
        - photo_denoiser
      type: string
    request_content_3_scale_factor:
      description: >
        Image scaling factor for upscaling. Determines how much larger the
        output image will be compared to the input.

        For example, a scale ratio of 2 will double the dimensions (2x width and
        2x height, resulting in 4x total pixels).

        Valid values range from 2 to 16. Can be provided as an integer or
        string.
      oneOf:
        - maximum: 16
          minimum: 2
          type: integer
        - pattern: ^(2|3|4|5|6|7|8|9|1[0-6])$
          type: string
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