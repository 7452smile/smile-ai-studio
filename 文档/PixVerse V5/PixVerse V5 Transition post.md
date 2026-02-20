> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# PixVerse V5 - Video transition

> Generate a video transition between two images using the PixVerse-V5 model.



## OpenAPI

````yaml post /v1/ai/image-to-video/pixverse-v5-transition
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
  /v1/ai/image-to-video/pixverse-v5-transition:
    post:
      tags:
        - image-to-video
      summary: PixVerse V5 - Video transition
      description: >-
        Generate a video transition between two images using the PixVerse-V5
        model.
      operationId: create_pixverse_v5_transition_video
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/transition-request'
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
          description: OK
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
    transition-request:
      properties:
        prompt:
          description: Prompt describing the video transition to generate
          type: string
        resolution:
          $ref: '#/components/schemas/resolution'
        duration:
          default: 5
          description: >-
            The duration of the generated video in seconds. 8s videos cost
            double. 1080p videos are limited to 5 seconds
          enum:
            - 5
            - 8
          type: integer
        negative_prompt:
          default: ''
          description: Negative prompt to be used for the generation
          type: string
        seed:
          description: >-
            The same seed and the same prompt given to the same version of the
            model will output the same video every time
          type: integer
        first_image_url:
          description: URL of the image to use as the first frame
          format: uri
          type: string
        last_image_url:
          description: URL of the image to use as the last frame
          format: uri
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
      required:
        - first_image_url
        - last_image_url
        - prompt
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
    resolution:
      description: The resolution of the generated video
      enum:
        - 360p
        - 540p
        - 720p
        - 1080p
      type: string
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