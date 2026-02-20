> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Seedance Pro 1080p - Create video from image

> Generate a video from image using the Seedance Pro 1080p model.



## OpenAPI

````yaml post /v1/ai/image-to-video/seedance-pro-1080p
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
  /v1/ai/image-to-video/seedance-pro-1080p:
    post:
      tags:
        - image-to-video
      summary: Seedance Pro 1080p - Create video from image
      description: Generate a video from image using the Seedance Pro 1080p model.
      operationId: create_video_seedance_pro_1080p
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/itvseedance-pro-1080p-request-content'
        required: true
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/create_image_from_text_flux_200_response'
          description: OK - Task created successfully
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
    itvseedance-pro-1080p-request-content:
      allOf:
        - $ref: '#/components/schemas/seedance-base'
      title: Image to Video - Seedance Pro 1080p
    create_image_from_text_flux_200_response:
      example:
        data:
          task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
          status: CREATED
      properties:
        data:
          $ref: '#/components/schemas/task'
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
    seedance-base:
      properties:
        webhook_url:
          description: >
            Optional callback URL that will receive asynchronous notifications
            whenever the task changes status. The payload sent to this URL is
            the same as the corresponding GET endpoint response, but without the
            data field.
          example: https://www.example.com/webhook
          format: uri
          type: string
        image:
          description: >-
            The image to use for the video generation. Supported formats: URL of
            the image or base64 encoding of the image.
          example: >-
            https://img.freepik.com/free-photo/beautiful-girl-dancing_123456-7890.jpg
          type: string
        prompt:
          description: >-
            The text content used for the video generation. This is the main
            description of the video to be generated.
          example: >-
            A beautiful girl opens her eyes and smiles warmly, the camera gently
            zooms in capturing the sparkle in her eyes, soft natural lighting
          maxLength: 2000
          type: string
        duration:
          default: '5'
          description: Video duration in seconds
          enum:
            - '5'
            - '10'
          example: '5'
          type: string
        camera_fixed:
          default: false
          description: Whether the camera position should be fixed
          example: false
          type: boolean
        aspect_ratio:
          $ref: '#/components/schemas/seedance-aspect-ratio'
        frames_per_second:
          default: 24
          description: Frames per second for the video
          enum:
            - 24
          example: 24
          type: integer
        seed:
          default: -1
          description: Random seed for video generation. Use -1 for random seed.
          example: 69
          maximum: 4294967295
          minimum: -1
          type: integer
      required:
        - prompt
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
    seedance-aspect-ratio:
      default: widescreen_16_9
      description: >-
        Video aspect ratio. `(If image is provided, the aspect ratio will be
        automatically detected from the image.)`
      enum:
        - film_horizontal_21_9
        - widescreen_16_9
        - classic_4_3
        - square_1_1
        - traditional_3_4
        - social_story_9_16
        - film_vertical_9_21
      example: widescreen_16_9
      type: string
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