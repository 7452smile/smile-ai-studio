> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Voiceover - Generate speech from text

> Generate natural-sounding speech from text using ElevenLabs AI voices.

Create professional voiceovers for videos, podcasts, presentations, and more.
Supports multiple languages, voice customization, and high-quality audio output.




## OpenAPI

````yaml post /v1/ai/voiceover/elevenlabs-turbo-v2-5
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
  /v1/ai/voiceover/elevenlabs-turbo-v2-5:
    post:
      tags:
        - voiceover
      summary: Voiceover - Generate speech from text
      description: >
        Generate natural-sounding speech from text using ElevenLabs AI voices.


        Create professional voiceovers for videos, podcasts, presentations, and
        more.

        Supports multiple languages, voice customization, and high-quality audio
        output.
      operationId: create_voiceover_task
      requestBody:
        content:
          application/json:
            examples:
              basic:
                summary: Basic voiceover generation
                value:
                  text: >-
                    Welcome to Freepik. Create amazing designs with AI-powered
                    tools.
                  voice_id: 21m00Tcm4TlvDq8ikWAM
              with_settings:
                summary: Voiceover with custom voice settings
                value:
                  text: >-
                    Hello! This is a professional voiceover for your video
                    project.
                  voice_id: 21m00Tcm4TlvDq8ikWAM
                  stability: 0.6
                  similarity_boost: 0.3
                  speed: 1.1
                  use_speaker_boost: true
            schema:
              $ref: '#/components/schemas/request_7'
        required: true
      responses:
        '200':
          content:
            application/json:
              examples:
                success - task created:
                  $ref: '#/components/examples/200-task-created'
              schema:
                $ref: >-
                  #/components/schemas/get_style_transfer_task_status_200_response
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
    request_7:
      properties:
        text:
          description: >-
            The text to convert to speech. Supports UTF-8 characters including
            accented letters and non-Latin scripts.
          example: Welcome to Freepik. Create amazing designs with AI-powered tools.
          maxLength: 40000
          minLength: 1
          type: string
        voice_id:
          description: >-
            The unique identifier of the ElevenLabs voice to use for synthesis.
            You can find voice IDs in the ElevenLabs voice library.
          example: 21m00Tcm4TlvDq8ikWAM
          type: string
        stability:
          default: 0.5
          description: >-
            Controls voice consistency and expressiveness. Lower values (0.0)
            produce more expressive and varied speech, while higher values (1.0)
            produce more consistent and stable output.
          example: 0.5
          maximum: 1
          minimum: 0
          type: number
        similarity_boost:
          default: 0.2
          description: >-
            Controls how closely the generated voice matches the original voice
            sample. Higher values produce closer matching but may introduce
            artifacts.
          example: 0.2
          maximum: 1
          minimum: 0
          type: number
        speed:
          default: 1
          description: >-
            Speech rate multiplier. 0.7 is 30% slower than normal, 1.0 is normal
            speed, 1.2 is 20% faster.
          example: 1
          maximum: 1.2
          minimum: 0.7
          type: number
        use_speaker_boost:
          default: true
          description: >-
            Enable speaker boost for enhanced voice clarity and presence in the
            generated audio.
          example: true
          type: boolean
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
        - text
        - voice_id
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
    200-task-created:
      summary: Success - Task created
      value:
        data:
          generated: []
          task_id: 046b6c7f-0b8a-43b9-b35d-6489e6daee91
          status: CREATED
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