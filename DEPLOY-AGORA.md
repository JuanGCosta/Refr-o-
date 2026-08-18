# REFRÃO — DEPLOY DE PRODUÇÃO

## Opção recomendada: 1 deploy no Render

Essa versão foi preparada para o mesmo serviço Node hospedar:

- frontend React/Vite
- Socket.IO / multiplayer
- criação e entrada em salas
- previews de áudio
- rota `/sala/CODIGO`
- health check

Assim você não precisa configurar duas hospedagens para começar.

### 1. Suba esta pasta para um repositório GitHub

O arquivo `render.yaml` já está na raiz.

### 2. No Render

1. Entre no Render.
2. Crie um novo **Blueprint** e conecte o repositório.
3. O Render detectará `render.yaml`.
4. Confirme a criação do serviço `refrao-game`.
5. Aguarde o build e o deploy.

O build executa:

`npm ci --include=dev && npm run build`

E o servidor inicia com:

`npm run start -w server`

Quando estiver pronto, abra a URL fornecida pelo Render.

### 3. Teste

Abra:

`https://SEU-SERVICO.onrender.com/health`

Enquanto o catálogo estiver sendo preparado, `ready` será `false`.
Quando estiver jogável, aparecerá:

`"ready": true`

Na home do jogo os botões ficam desativados enquanto o servidor aquece.

---

## Opção 2: Netlify + Render separados

Use esta opção se quiser que o frontend abra instantaneamente no Netlify.

### Backend

Publique primeiro o Render normalmente.

### Frontend no Netlify

O `netlify.toml` já contém build, publish e fallback da SPA.

No Netlify adicione a variável de ambiente:

`VITE_SERVER_URL=https://SEU-BACKEND.onrender.com`

Depois faça um novo deploy.

Opcionalmente, no Render troque:

`REFRAO_ALLOWED_ORIGINS=*`

por:

`REFRAO_ALLOWED_ORIGINS=https://SEU-SITE.netlify.app`

### Rotas de sala

Links como:

`https://seu-site.netlify.app/sala/AB7K2`

funcionam diretamente graças ao fallback configurado no `netlify.toml`.

---

## Desenvolvimento local

`npm install`

`npm run dev`

Frontend:

`http://localhost:5175`

Servidor:

`http://localhost:4010`

---

## Antes de divulgar

Para testes, o plano gratuito do Render serve. Para público real, considere um serviço que não entre em suspensão, para evitar espera na primeira abertura após período sem tráfego.
