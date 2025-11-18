# GPS API Frontend Tester

Uma interface simples (React + Vite + TS) para testar integrações com a API (ex.: Catapult) mesmo sem possuir a API key ainda.

## Recursos
- Configuração de Base URL, API Key e modo Mock
- Montador de requisições (método, path, headers, body JSON/texto)
- Visualização de resposta completa (status, headers, tempo, corpo)

As configurações ficam salvas no `localStorage` para conveniência.

## Rodando localmente

Pré-requisitos: Node 18+ e npm

```bash
cd frontend
npm install
npm run dev
```

Depois acesse http://localhost:5173.

- Modo Mock ligado: não faz chamadas externas; retorna resposta simulada.
- Modo Mock desligado: envia para `Base URL + path` com os headers e body definidos.

## Build
```bash
npm run build
npm run preview
```

## Próximos passos (quando tiver a API key)
- Definir headers específicos exigidos pela Catapult (ex.: Authorization)
- Criar presets no Request Builder para endpoints mais usados
- Se necessário, adicionar validação e schemas (Zod) para requests/responses
