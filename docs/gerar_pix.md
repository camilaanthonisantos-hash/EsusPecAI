{

&#x20; "nodes": \[

&#x20;   {

&#x20;     "parameters": {

&#x20;       "content": "Fluxo gerador de pix",

&#x20;       "height": 112,

&#x20;       "width": 182

&#x20;     },

&#x20;     "type": "n8n-nodes-base.stickyNote",

&#x20;     "position": \[

&#x20;       -48,

&#x20;       16

&#x20;     ],

&#x20;     "typeVersion": 1,

&#x20;     "id": "b5df868f-0442-4da4-810b-38820d89815c",

&#x20;     "name": "Sticky Note"

&#x20;   },

&#x20;   {

&#x20;     "parameters": {

&#x20;       "httpMethod": "POST",

&#x20;       "path": "gerar\_pix\_bronze\_camila",

&#x20;       "responseMode": "responseNode",

&#x20;       "options": {}

&#x20;     },

&#x20;     "type": "n8n-nodes-base.webhook",

&#x20;     "typeVersion": 2.1,

&#x20;     "position": \[

&#x20;       192,

&#x20;       16

&#x20;     ],

&#x20;     "id": "2a1479d1-b6b3-4c24-9605-c7be4e9b92b5",

&#x20;     "name": "Webhook-gerar-pag1",

&#x20;     "webhookId": "5a675d1d-1b61-46fb-a785-f00d461c44e6"

&#x20;   },

&#x20;   {

&#x20;     "parameters": {

&#x20;       "operation": "createPixOrder",

&#x20;       "customerName": "={{ $json.body.userName }}",

&#x20;       "customerEmail": "={{ $json.body.Email }}",

&#x20;       "customerTaxId": "={{ $json.body.userCpf }}",

&#x20;       "items": {

&#x20;         "itemProperties": \[

&#x20;           {

&#x20;             "name": "={{ $json.body\['Nome-servico'] }}",

&#x20;             "quantity": "=1",

&#x20;             "unit\_amount": "={{ $json.body.Valor }}"

&#x20;           }

&#x20;         ]

&#x20;       },

&#x20;       "additionalFields": {

&#x20;         "referenceId": "={{ $('Webhook-gerar-pag1').item.json.body.agendamento\_id }}",

&#x20;         "redirectUrl": "",

&#x20;         "notificationUrl": "https://n8n.mentoriajrs.com/webhook/pagbank-retorno-pix"

&#x20;       }

&#x20;     },

&#x20;     "type": "n8n-nodes-pagbank-connect.pagBank",

&#x20;     "typeVersion": 1,

&#x20;     "position": \[

&#x20;       528,

&#x20;       16

&#x20;     ],

&#x20;     "id": "88d3785d-5447-423c-9c69-d87f9af639e5",

&#x20;     "name": "PagBank1",

&#x20;     "alwaysOutputData": false,

&#x20;     "credentials": {

&#x20;       "pagBankConnect": {

&#x20;         "id": "zp5IxDltwlpMwLA7",

&#x20;         "name": "PagBank Connect account"

&#x20;       }

&#x20;     }

&#x20;   },

&#x20;   {

&#x20;     "parameters": {

&#x20;       "respondWith": "json",

&#x20;       "responseBody": "={\\n  \\"chave-pix-copia-cola\\": \\"{{ $json.qr\_codes\[0].text }}\\",\\n  \\"qr-code\\": \\"{{ $json.qr\_codes\[0].links\[0].href }}\\",\\n  \\"id-pix\\": \\"{{ $json.id }}\\",\\n  \\"status\\": \\"success\\"\\n}",

&#x20;       "options": {

&#x20;         "responseHeaders": {

&#x20;           "entries": \[

&#x20;             {

&#x20;               "name": "Access-Control-Allow-Origin",

&#x20;               "value": "\*"

&#x20;             },

&#x20;             {

&#x20;               "name": "Access-Control-Allow-Headers",

&#x20;               "value": "Content-Type, Accept"

&#x20;             }

&#x20;           ]

&#x20;         }

&#x20;       }

&#x20;     },

&#x20;     "id": "ac9e97be-0f11-48f0-b050-5511df9b4d7d",

&#x20;     "name": "Respond to Webhook1",

&#x20;     "type": "n8n-nodes-base.respondToWebhook",

&#x20;     "typeVersion": 1,

&#x20;     "position": \[

&#x20;       1072,

&#x20;       16

&#x20;     ]

&#x20;   }

&#x20; ],

&#x20; "connections": {

&#x20;   "Webhook-gerar-pag1": {

&#x20;     "main": \[

&#x20;       \[

&#x20;         {

&#x20;           "node": "PagBank1",

&#x20;           "type": "main",

&#x20;           "index": 0

&#x20;         }

&#x20;       ]

&#x20;     ]

&#x20;   },

&#x20;   "PagBank1": {

&#x20;     "main": \[

&#x20;       \[

&#x20;         {

&#x20;           "node": "Respond to Webhook1",

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

