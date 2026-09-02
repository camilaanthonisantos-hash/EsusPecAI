{

&#x20; "nodes": \[

&#x20;   {

&#x20;     "parameters": {

&#x20;       "httpMethod": "POST",

&#x20;       "path": "pagbank-retorno-pix",

&#x20;       "options": {}

&#x20;     },

&#x20;     "name": "Webhook Retorno PagBank",

&#x20;     "type": "n8n-nodes-base.webhook",

&#x20;     "typeVersion": 1,

&#x20;     "position": \[

&#x20;       192,

&#x20;       320

&#x20;     ],

&#x20;     "id": "d2a8f6a6-597c-4133-bd24-86155e556ebf",

&#x20;     "webhookId": "1a30c453-309f-492c-b847-8d184ea996e7"

&#x20;   },

&#x20;   {

&#x20;     "parameters": {

&#x20;       "method": "PATCH",

&#x20;       "url": "=https://adykdpszmkyvkaieqtxa.supabase.co/rest/v1/agendamentos?id=eq.{{ $json.body.reference\_id }}",

&#x20;       "sendHeaders": true,

&#x20;       "headerParameters": {

&#x20;         "parameters": \[

&#x20;           {

&#x20;             "name": "apikey",

&#x20;             "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeWtkcHN6bWt5dmthaWVxdHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMDE2NTUsImV4cCI6MjEwMjY3NzY1NX0.zJrQJUxTVVWeEu62O7i7iTG52bafkXt-w3bpXxPtr2o"

&#x20;           },

&#x20;           {

&#x20;             "name": "Authorization",

&#x20;             "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeWtkcHN6bWt5dmthaWVxdHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMDE2NTUsImV4cCI6MjEwMjY3NzY1NX0.zJrQJUxTVVWeEu62O7i7iTG52bafkXt-w3bpXxPtr2o"

&#x20;           }

&#x20;         ]

&#x20;       },

&#x20;       "sendBody": true,

&#x20;       "bodyParameters": {

&#x20;         "parameters": \[

&#x20;           {

&#x20;             "name": "status\_pagamento",

&#x20;             "value": "pago"

&#x20;           }

&#x20;         ]

&#x20;       },

&#x20;       "options": {}

&#x20;     },

&#x20;     "name": "HTTP Request - Atualiza Supabase",

&#x20;     "type": "n8n-nodes-base.httpRequest",

&#x20;     "typeVersion": 4,

&#x20;     "position": \[

&#x20;       1056,

&#x20;       464

&#x20;     ],

&#x20;     "id": "941072b9-20c3-4e67-b8a4-17dcf4721f4e"

&#x20;   },

&#x20;   {

&#x20;     "parameters": {

&#x20;       "content": "Fluxo confirmar pagamento pix",

&#x20;       "height": 112,

&#x20;       "width": 166

&#x20;     },

&#x20;     "type": "n8n-nodes-base.stickyNote",

&#x20;     "position": \[

&#x20;       -48,

&#x20;       320

&#x20;     ],

&#x20;     "typeVersion": 1,

&#x20;     "id": "e567f8d9-06fd-4ef9-ae16-0009aa976bec",

&#x20;     "name": "Sticky Note1"

&#x20;   },

&#x20;   {

&#x20;     "parameters": {

&#x20;       "rules": {

&#x20;         "values": \[

&#x20;           {

&#x20;             "conditions": {

&#x20;               "options": {

&#x20;                 "caseSensitive": true,

&#x20;                 "leftValue": "",

&#x20;                 "typeValidation": "strict",

&#x20;                 "version": 2

&#x20;               },

&#x20;               "conditions": \[

&#x20;                 {

&#x20;                   "leftValue": "={{ $json.body.reference\_id }}",

&#x20;                   "rightValue": "prod\_",

&#x20;                   "operator": {

&#x20;                     "type": "string",

&#x20;                     "operation": "startsWith"

&#x20;                   },

&#x20;                   "id": "932ddf49-9126-4bbb-a982-7f028de7390a"

&#x20;                 }

&#x20;               ],

&#x20;               "combinator": "and"

&#x20;             }

&#x20;           }

&#x20;         ]

&#x20;       },

&#x20;       "options": {

&#x20;         "fallbackOutput": "extra"

&#x20;       }

&#x20;     },

&#x20;     "type": "n8n-nodes-base.switch",

&#x20;     "typeVersion": 3.3,

&#x20;     "position": \[

&#x20;       544,

&#x20;       320

&#x20;     ],

&#x20;     "id": "995736c7-5578-4534-a069-7daf8c94cee1",

&#x20;     "name": "Switch"

&#x20;   },

&#x20;   {

&#x20;     "parameters": {

&#x20;       "method": "PATCH",

&#x20;       "url": "=https://adykdpszmkyvkaieqtxa.supabase.co/rest/v1/pedidos\_produtos?id=eq.{{ $json.body.reference\_id.replace('prod\_', '') }}",

&#x20;       "sendHeaders": true,

&#x20;       "headerParameters": {

&#x20;         "parameters": \[

&#x20;           {

&#x20;             "name": "apikey",

&#x20;             "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeWtkcHN6bWt5dmthaWVxdHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMDE2NTUsImV4cCI6MjEwMjY3NzY1NX0.zJrQJUxTVVWeEu62O7i7iTG52bafkXt-w3bpXxPtr2o"

&#x20;           },

&#x20;           {

&#x20;             "name": "Authorization",

&#x20;             "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeWtkcHN6bWt5dmthaWVxdHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMDE2NTUsImV4cCI6MjEwMjY3NzY1NX0.zJrQJUxTVVWeEu62O7i7iTG52bafkXt-w3bpXxPtr2o"

&#x20;           }

&#x20;         ]

&#x20;       },

&#x20;       "sendBody": true,

&#x20;       "bodyParameters": {

&#x20;         "parameters": \[

&#x20;           {

&#x20;             "name": "status\_pagamento",

&#x20;             "value": "pago"

&#x20;           }

&#x20;         ]

&#x20;       },

&#x20;       "options": {}

&#x20;     },

&#x20;     "name": "Atualiza\_tabela\_pedidos\_produtos\_supabase",

&#x20;     "type": "n8n-nodes-base.httpRequest",

&#x20;     "typeVersion": 4,

&#x20;     "position": \[

&#x20;       1056,

&#x20;       240

&#x20;     ],

&#x20;     "id": "d2a7df22-e863-4945-973a-105f1f980184"

&#x20;   }

&#x20; ],

&#x20; "connections": {

&#x20;   "Webhook Retorno PagBank": {

&#x20;     "main": \[

&#x20;       \[

&#x20;         {

&#x20;           "node": "Switch",

&#x20;           "type": "main",

&#x20;           "index": 0

&#x20;         }

&#x20;       ]

&#x20;     ]

&#x20;   },

&#x20;   "Switch": {

&#x20;     "main": \[

&#x20;       \[

&#x20;         {

&#x20;           "node": "Atualiza\_tabela\_pedidos\_produtos\_supabase",

&#x20;           "type": "main",

&#x20;           "index": 0

&#x20;         }

&#x20;       ],

&#x20;       \[

&#x20;         {

&#x20;           "node": "HTTP Request - Atualiza Supabase",

&#x20;           "type": "main",

&#x20;           "index": 0

&#x20;         }

&#x20;       ]

&#x20;     ]

&#x20;   }

&#x20; },

&#x20; "pinData": {},

&#x20; "meta": {

&#x20;   "templateCredsSetupCompleted": true,

&#x20;   "instanceId": "9d82980faecd1ce42f7a71d57f86c7868a66e1fbaae174b4dbd573da57be17a9"

&#x20; }

}

vamos planejar uma nova funcionalidade para implementarmos a esse saas, seria uma forma de cobrar o acesso quinzenalmente, mensalmente e anualmente. teria que ser o mesmo pratico possivel, O usuario se cadastrava, acessava o app como usuario comum e poderia gerar apenas um prontuario free, depois dessa geração o sistema já iria cobrar que o usuario fizesse um plano mostrando uma janela suspensa com as etapas para concluir a aquisição do plano que seria basicamente informar os seguintes dados: Nome completo, Email valido, cpf valido, telefone valido.



Esses dados somado com os dados do plano escolhido (nome do plano, valor e duração) seria enviado ao fluxo do n8n \[gerar\_pix.md](file;file:///c%3A/Users/Jerime/Documents/App-Pec-AI/EsusPecAI/docs/gerar\_pix.md), em seguida em fluxo iria retornar um pix para o usuario efetuar o pagamento.

