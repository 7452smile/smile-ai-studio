> ## Documentation Index
> Fetch the complete documentation index at: https://docs.freepik.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Music Generation - Generate from text

> Generate original music tracks from text descriptions using AI.

Create high-quality music compositions based on your text prompts. Specify genre, mood, instruments, and tempo to get exactly the sound you need. Perfect for video production, game development, podcasts, and multimedia projects.

**Tips for effective prompts:**
- Include genre: "jazz", "electronic", "classical", "rock"
- Describe mood: "upbeat", "melancholic", "energetic", "peaceful"
- Mention instruments: "piano", "guitar", "drums", "synthesizer"
- Add tempo hints: "slow", "fast-paced", "moderate groove"




## OpenAPI

````yaml post /v1/ai/music-generation
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
  /v1/ai/music-generation:
    post:
      tags:
        - music-generation
      summary: Music Generation - Generate from text
      description: >
        Generate original music tracks from text descriptions using AI.


        Create high-quality music compositions based on your text prompts.
        Specify genre, mood, instruments, and tempo to get exactly the sound you
        need. Perfect for video production, game development, podcasts, and
        multimedia projects.


        **Tips for effective prompts:**

        - Include genre: "jazz", "electronic", "classical", "rock"

        - Describe mood: "upbeat", "melancholic", "energetic", "peaceful"

        - Mention instruments: "piano", "guitar", "drums", "synthesizer"

        - Add tempo hints: "slow", "fast-paced", "moderate groove"
      operationId: create_music_generation_task
      requestBody:
        content:
          application/json:
            examples:
              basic:
                summary: Basic music generation
                value:
                  prompt: A Blues guitar solo with emotional bends and slides
                  music_length_seconds: 60
              ambient:
                summary: Ambient electronic track
                value:
                  prompt: >-
                    Calm ambient electronic music with soft synth pads, gentle
                    arpeggios, and a peaceful atmosphere
                  music_length_seconds: 120
            schema:
              $ref: '#/components/schemas/request_6'
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
    request_6:
      properties:
        prompt:
          description: >
            Text description of the music you want to generate.

            Be specific about the style, mood, instruments, tempo, and genre for
            best results.


            **Tips for effective prompts:**

            - Include genre: "jazz", "electronic", "classical", "rock"

            - Describe mood: "upbeat", "melancholic", "energetic", "peaceful"

            - Mention instruments: "piano", "guitar", "drums", "synthesizer"

            - Add tempo hints: "slow", "fast-paced", "moderate groove"
          example: A Blues guitar solo with emotional bends and slides
          maxLength: 2500
          type: string
        music_length_seconds:
          description: |
            Duration of the generated music track in seconds.

            **Duration limits:**
            - Minimum: 10 seconds
            - Maximum: 240 seconds (4 minutes)

            **Common durations:**
            - 30 seconds
            - 60 seconds (1 minute)
            - 120 seconds (2 minutes)
            - 240 seconds (4 minutes)
          example: 60
          maximum: 240
          minimum: 10
          type: integer
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
        - music_length_seconds
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