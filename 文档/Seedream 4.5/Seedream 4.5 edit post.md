> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Seedream 4.5 - Edit image

> Edit images using ByteDance's Seedream 4.5 model with text guidance.

**Key Features:**
- Preserves subject details, lighting, and color tone
- Supports up to 5 reference images
- Enhanced editing consistency
- Up to 4MP output resolution

**Best for:**
- Image-to-image editing
- Style transfer with consistency
- Multi-image reference editing




## OpenAPI

````yaml post /v1/ai/text-to-image/seedream-v4-5-edit
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
  /v1/ai/text-to-image/seedream-v4-5-edit:
    post:
      tags:
        - text-to-image
      summary: Seedream 4.5 - Edit image
      description: |
        Edit images using ByteDance's Seedream 4.5 model with text guidance.

        **Key Features:**
        - Preserves subject details, lighting, and color tone
        - Supports up to 5 reference images
        - Enhanced editing consistency
        - Up to 4MP output resolution

        **Best for:**
        - Image-to-image editing
        - Style transfer with consistency
        - Multi-image reference editing
      operationId: create_image_edit_seedream_v4_5
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ttisdv45-edit-request-content'
        required: true
      responses:
        '200':
          content:
            application/json:
              examples:
                success - in progress task:
                  $ref: '#/components/examples/200-task-in-progress'
              schema:
                $ref: >-
                  #/components/schemas/get_style_transfer_task_status_200_response
          description: >-
            OK - The request has succeeded and the Seedream 4.5 edit process has
            started.
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
    ttisdv45-edit-request-content:
      allOf:
        - $ref: '#/components/schemas/ttisdv45-request-content'
        - properties:
            reference_images:
              description: >
                Array of reference images for image editing.

                Seedream 4.5 preserves subject details, lighting, and color tone
                when editing.


                **Supported formats:**

                - Base64-encoded image strings

                - Publicly accessible image URLs


                **Image requirements:**

                - Minimum resolution: 256x256 pixels

                - Maximum file size: 10MB per image

                - Supported formats: JPG, JPEG, PNG
              example:
                - https://example.com/reference-image-1.jpg
                - https://example.com/reference-image-2.jpg
              items:
                description: Image as Base64 encoded string or publicly accessible URL
                type: string
              maxItems: 5
              minItems: 1
              type: array
          required:
            - reference_images
          type: object
    get_style_transfer_task_status_200_response:
      example:
        data:
          generated:
            - https://openapi-generator.tech
            - https://openapi-generator.tech
          task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
          status: CREATED
      properties:
        data:
          $ref: '#/components/schemas/task-detail'
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
    ttisdv45-request-content:
      properties:
        prompt:
          description: >
            Text description of the image you want to generate.


            **Tips:**

            - Be specific about visual details, composition, and style

            - Seedream 4.5 excels at rendering text and typography

            - Describe lighting, atmosphere, and camera angles for best results


            **Examples:**

            - Simple: "A modern logo design with clean typography"

            - Detailed: "Professional marketing poster for a tech startup,
            minimalist design, bold sans-serif typography, gradient blue
            background, high contrast"
          example: A professional marketing poster with elegant typography
          maxLength: 4096
          type: string
        webhook_url:
          description: >
            Optional callback URL that will receive asynchronous notifications
            whenever the task changes status. The payload sent to this URL is
            the same as the corresponding GET endpoint response, but without the
            data field.
          example: https://www.example.com/webhook
          format: uri
          type: string
        aspect_ratio:
          default: square_1_1
          description: >
            The aspect ratio of the generated image. Seedream 4.5 supports up to
            4MP resolution.


            Available options:

            - `square_1_1`: Square format (2048x2048) - Instagram feed, profile
            pictures

            - `widescreen_16_9`: Landscape (2730x1536) - YouTube thumbnails,
            presentations

            - `social_story_9_16`: Portrait (1536x2730) - TikTok, Instagram
            Stories

            - `portrait_2_3`: Tall portrait (1672x2508) - Pinterest pins

            - `traditional_3_4`: Classic photo (1774x2364) - Traditional
            photography

            - `standard_3_2`: Photo print (2508x1672) - Standard prints

            - `classic_4_3`: Monitor ratio (2364x1774) - Classic displays

            - `cinematic_21_9`: Ultra-wide (3062x1312) - Cinematic banners
          enum:
            - square_1_1
            - widescreen_16_9
            - social_story_9_16
            - portrait_2_3
            - traditional_3_4
            - standard_3_2
            - classic_4_3
            - cinematic_21_9
          example: square_1_1
          type: string
        seed:
          description: >
            Random seed for reproducibility.

            Using the same seed with identical parameters produces similar
            results.

            Useful for iterating on a design or creating variations.
          example: 12345
          maximum: 4294967295
          minimum: 0
          type: integer
        enable_safety_checker:
          default: true
          description: |
            Whether to enable the content safety checker.
            When enabled, the model filters potentially unsafe content.
          type: boolean
      required:
        - prompt
      type: object
    task-detail:
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
    200-task-in-progress:
      summary: Success - Task in progress
      value:
        data:
          generated: []
          task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
          status: IN_PROGRESS
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