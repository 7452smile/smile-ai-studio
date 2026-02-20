> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# MiniMax Hailuo 02 1080p - Create video from text or image

> Generate a video from text or image using the MiniMax Hailuo-02 1080p model.



## OpenAPI

````yaml post /v1/ai/image-to-video/minimax-hailuo-02-1080p
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
  /v1/ai/image-to-video/minimax-hailuo-02-1080p:
    post:
      tags:
        - image-to-video
      summary: MiniMax Hailuo 02 1080p - Create video from text or image
      description: >-
        Generate a video from text or image using the MiniMax Hailuo-02 1080p
        model.
      operationId: create_video_minimax_hailuo_02_1080p
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/create_video_minimax_hailuo_02_1080p_request
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
    create_video_minimax_hailuo_02_1080p_request:
      oneOf:
        - $ref: '#/components/schemas/itvminimax-1080p-request-content'
        - $ref: '#/components/schemas/ttvminimax-1080p-request-content'
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
    itvminimax-1080p-request-content:
      allOf:
        - $ref: '#/components/schemas/minimax-hailuo-02-base'
        - properties:
            first_frame_image:
              description: >-
                The model will use the image passed in this parameter as the
                first frame to generate a video. Supported formats: URL of the
                image or base64 encoding of the image. Image specifications:
                format must be JPG, JPEG, or PNG; aspect ratio should be greater
                than 2:5 and less than 5:2; the shorter side must exceed 300
                pixels; file size must not exceed 20MB.
              example: >-
                https://img.freepik.com/free-photo/beautiful-sunset-over-mountains_123456-7890.jpg
              type: string
            last_frame_image:
              description: >-
                The model will use the image passed in this parameter as the
                last frame to generate a video. Supported formats: URL of the
                image or base64 encoding of the image. Image specifications:
                format must be JPG, JPEG, or PNG; aspect ratio should be greater
                than 2:5 and less than 5:2; the shorter side must exceed 300
                pixels; file size must not exceed 20MB.
              example: >-
                https://img.freepik.com/free-photo/beautiful-sunset-over-mountains_123456-7890.jpg
              type: string
            duration:
              default: 6
              description: Video length in seconds (1080P only supports 6 seconds)
              enum:
                - 6
              example: 6
              type: integer
          required:
            - first_frame_image
          type: object
      title: Image to Video
    ttvminimax-1080p-request-content:
      allOf:
        - $ref: '#/components/schemas/minimax-hailuo-02-base'
        - properties:
            duration:
              default: 6
              description: Video length in seconds (1080P only supports 6 seconds)
              enum:
                - 6
              example: 6
              type: integer
          type: object
      title: Text to Video
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
    minimax-hailuo-02-base:
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
        prompt:
          description: >-
            Description of the video. Note: It should be less than 2000
            characters.
          example: A beautiful sunset over the mountains with birds flying in the sky
          maxLength: 2000
          type: string
        prompt_optimizer:
          default: true
          description: >-
            Whether to use the prompt optimizer. If true, the model will
            automatically optimize the incoming prompt to improve the generation
            quality.
          type: boolean
      required:
        - prompt
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