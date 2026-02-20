> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# WAN 2.6 1080p - Create video from image

> Generate a 1080p video from image using the WAN 2.6 model.



## OpenAPI

````yaml post /v1/ai/image-to-video/wan-v2-6-1080p
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
  /v1/ai/image-to-video/wan-v2-6-1080p:
    post:
      tags:
        - image-to-video
      summary: WAN 2.6 1080p - Create video from image
      description: Generate a 1080p video from image using the WAN 2.6 model.
      operationId: create_video_wan_v26_i2v_1080p
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/i2v-wan-v26-1080p-request-content'
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
    i2v-wan-v26-1080p-request-content:
      allOf:
        - $ref: '#/components/schemas/wan-v26-i2v-base'
      description: Generate 1080p video from image using WAN v2.6 model
      title: Image to Video - WAN v2.6 1080p
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
    wan-v26-i2v-base:
      allOf:
        - $ref: '#/components/schemas/wan-v26-base'
        - properties:
            image:
              description: >
                URL of the keyframe or base image to animate. Must be publicly
                accessible.


                **Supported formats:** JPEG, PNG, WebP

                **Recommended:** High quality image with clear subject
              example: https://example.com/image.jpg
              type: string
          type: object
      required:
        - image
        - prompt
      title: WAN v2.6 Image-to-Video Base
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
    wan-v26-base:
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
          description: >
            Main description of the video - scene, characters, motion, camera
            moves, style.


            **Tips:**

            - Be specific about scenes and visual details

            - Describe camera movements (zoom, pan, tilt)

            - Mention lighting and atmosphere


            **Examples:**

            - Simple: "a cat sitting on a windowsill"

            - Detailed: "fluffy orange cat on wooden windowsill, looking at snow
            falling outside, soft warm lighting, camera slowly zooms in"
          example: >-
            A serene mountain landscape at golden hour with mist rising from the
            valley
          maxLength: 2000
          type: string
        size:
          description: |
            Video size/orientation:
            - `1280*720`: HD landscape (1280x720)
            - `720*1280`: HD portrait (720x1280)
            - `1920*1080`: Full HD landscape (1920x1080)
            - `1080*1920`: Full HD portrait (1080x1920)
          enum:
            - 1280*720
            - 720*1280
            - 1920*1080
            - 1080*1920
          example: 1280*720
          type: string
        duration:
          default: '5'
          description: |
            Video duration in seconds:
            - `5`: Short clip, faster generation
            - `10`: Medium length, more developed action
            - `15`: Longer video, most detailed scenes
          enum:
            - '5'
            - '10'
            - '15'
          example: '5'
          type: string
        negative_prompt:
          description: >
            Things to avoid in the generated video. Use this to prevent unwanted
            elements.


            **Examples:** "blurry, low quality, watermark, text, distortion,
            extra limbs"
          example: blurry, low quality, watermark
          maxLength: 1000
          type: string
        enable_prompt_expansion:
          default: false
          description: >
            Enable AI prompt optimizer to expand shorter prompts into detailed
            scripts.

            Useful when you have a simple idea but want richer video output.
          example: false
          type: boolean
        shot_type:
          default: single
          description: >
            Shot composition type:

            - `single`: Continuous single shot (default, recommended for most
            use cases)

            - `multi`: Multi-shot sequence with scene transitions (requires
            enable_prompt_expansion=true)
          enum:
            - single
            - multi
          example: single
          type: string
        seed:
          default: -1
          description: >
            Random seed for reproducibility. Use the same seed with identical
            parameters to get similar results.

            Set to -1 for random seed.
          example: 12345
          maximum: 2147483647
          minimum: -1
          type: integer
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