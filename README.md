# Refrão

## Versão final — identidade, assets e mobile-first

- Logo oficial do Refrão integrada à interface.
- 17 avatares de animais otimizados em WebP com transparência.
- Arte oficial do disco usada no visualizador durante as rodadas.
- Redesign completo de todas as etapas do jogo para desktop e mobile.
- Contagem regressiva 3, 2, 1, JÁ com efeitos sintetizados no Web Audio API.
- Destravamento do contexto de áudio na primeira interação para melhorar compatibilidade móvel.
- Safe areas, respostas maiores, HUD compacto e controles flutuantes que não cobrem a área de jogo.
- Favicon atualizado e assinatura JG.Dev preservada na home.


Jogo musical para 1–4 jogadores (modo solo de teste + multiplayer) de adivinhar músicas brasileiras o mais rápido possível. Sala por código, votação de gênero, rodadas cronometradas, pontuação por velocidade, placar em tempo real e pódio final — tudo sincronizado pelo servidor via Socket.IO.

## Como rodar localmente

Pré-requisitos: Node.js 18+ (usa `fetch` nativo).

```bash
npm install
npm run dev
```

Isso sobe **client** (Vite, porta `5175`) e **server** (Express + Socket.IO, porta `4010`) juntos. Na primeira vez, o servidor demora alguns segundos resolvendo o catálogo de músicas contra a API pública do Deezer (prévias de 30s + capa de álbum) — acompanhe o log `[catalog] pronto: X/Y músicas resolvidas`. Os metadados resolvidos ficam em cache (`server/data/previewCache.json`). Links de preview expirados são renovados automaticamente quando a música vai tocar.

Abra `http://localhost:5175`.


### Importante ao trocar de versão

Feche qualquer CMD antigo do Refrão antes de iniciar esta versão. Esta revisão usa as portas **5175** (jogo) e **4010** (servidor) justamente para evitar que o navegador se conecte sem querer a uma versão antiga que ainda esteja aberta.

### Testar sozinho

Crie uma sala normalmente. Quando apenas o host estiver conectado, o lobby entra automaticamente em **Modo de teste solo** e o botão muda para **Testar sozinho**. O fluxo completo continua disponível: votação de gênero, contagem regressiva, músicas, respostas, pontuação, placar e resultado final. Quando um segundo jogador entrar, o lobby volta automaticamente ao modo multiplayer normal.

## Jogar com amigos na mesma Wi-Fi (celular)

1. Descubra o IP local da máquina que está rodando o `npm run dev` (Windows: `ipconfig`, procure "Endereço IPv4", algo como `192.168.x.x`).
2. Nos celulares/computadores conectados à **mesma rede Wi-Fi**, acesse `http://<esse-ip>:5175`.
3. O cliente detecta automaticamente o host da página e fala com o servidor em `http://<mesmo-host>:4010` — não precisa configurar nada a mais.

Se quiser apontar o client para um servidor em outro endereço manualmente, defina `VITE_SERVER_URL` num `.env` dentro de `client/` (ex.: `VITE_SERVER_URL=http://192.168.0.10:4010`).

## Catálogo de músicas

A V7 mantém as **520 faixas locais revisadas** como base e, na inicialização do servidor, expande automaticamente as categorias prioritárias usando a API pública do Deezer e uma lista fechada de artistas por gênero. A meta é chegar a aproximadamente **1.067 músicas cadastradas por sessão**: Sertanejo 190, Acústico/Poesia 150, Trap 170, Funk 170, Modão/Raiz 160, além das bases de Pop, Rap e MPB.

A expansão só aceita faixas creditadas ao artista encontrado no pool daquele gênero e exige preview válido. O jogo continua sem armazenar MP3: usa somente previews temporários disponibilizados pela fonte. Se a API estiver indisponível, a base local continua funcionando normalmente.

As novas faixas recebem dificuldade e popularidade com base na posição entre as músicas mais populares de cada artista, e a expansão limita a quantidade adicionada por artista para evitar uma partida dominada por um único cantor/MC/dupla.


## Regras de gênero

A votação agora é **estrita**:

- 1 voto em Funk = 100% das rodadas em Funk.
- 2 votos em Funk + 1 em Rap = aproximadamente 2/3 Funk e 1/3 Rap.
- Gêneros sem nenhum voto não entram na partida.
- Se um gênero tiver poucas prévias disponíveis para a quantidade de rodadas escolhida, o jogo prefere repetir uma faixa daquele mesmo gênero em vez de inserir outro estilo.

O catálogo também recebeu uma limpeza de crossovers óbvios entre Funk/Pop, Sertanejo/Modão e Rap/Trap.

## Áudio entre a resposta e o resultado

O player de música é persistente no nível do aplicativo. Ao responder, a troca da tela de **PLAYING** para **ROUND_RESULT** não desmonta mais o áudio: a mesma prévia continua tocando enquanto o nome, a capa e a pontuação são revelados. O áudio é interrompido apenas quando entra o placar/contagem da próxima rodada, quando a partida termina ou quando o jogador sai para o menu.

## Sair durante a partida

Durante votação, contagem regressiva, rodada, resultado e placar existe um botão **Voltar ao menu** no canto superior esquerdo. Ele pede confirmação antes de sair. Em multiplayer, os demais jogadores continuam na sala e, se quem saiu era o host, o servidor migra o host para outro jogador conectado.

## Estrutura

```
refrao/
  shared/src/types.ts     tipos e eventos de socket compartilhados
  server/src/
    catalog/               catálogo + resolução via Deezer
    game/                  pontuação, sorteio de músicas, alternativas
    rooms/                 sala, máquina de estados, gerenciador de salas
    socket/                handlers dos eventos em tempo real
  client/src/
    pages/                 uma tela por etapa (lobby, votação, rodada, pódio...)
    components/            peças de UI reutilizáveis
    hooks/                 useSocket, useGameRoom (estado da partida), useSound...
    game/avatars.tsx       17 avatares de animais usando assets WebP
```

## Deploy público (para jogar com amigos fora da sua rede)

Não incluído automaticamente nesta entrega — abaixo o caminho recomendado:

1. **Servidor** (`server/`): hospede num serviço que sustente WebSocket, como Render, Railway ou Fly.io. Comando de start: `npm run start -w server` (usa `tsx`, não precisa de build). Configure a env var `REFRAO_SERVER_PORT` se a plataforma exigir uma porta específica (por padrão usa 4010).
2. **Client** (`client/`): hospede em Vercel ou Netlify. Configure a env var de build `VITE_SERVER_URL` apontando para a URL pública do servidor (ex.: `https://refrao-server.onrender.com`).
3. No `server/src/index.ts`, troque `cors: { origin: "*" }` pela URL real do client em produção, por segurança.

## Notas técnicas

- O servidor é a fonte única de verdade para: música sorteada, resposta correta, timestamp de início da rodada e pontuação — o cliente nunca recebe a resposta certa antes do fim da rodada.
- Reconexão automática via `sessionToken` salvo no `localStorage`; se o host cair, o próximo jogador conectado vira host.
- Efeitos sonoros são sintetizados no navegador via Web Audio API (sem arquivos de áudio externos).


## V5 — Party Mix
- Novo visual completo do lobby e jogo.
- Host escolhe 5/10/15/20/30 rodadas, 8/12/15/20 segundos e dificuldade.
- Nova categoria Acústico / Poesia.
- Novo voto Misturadão (todas as categorias).
- Catálogo expandido e limpeza de entradas claramente classificadas/atribuídas incorretamente.


## V6 — Trap + nova identidade + sorteio seguro

- Paleta principal trocada para grafite, turquesa e verde.
- Tela inicial agora mostra `Desenvolvido por JG.Dev`.
- Trap Nacional recebeu catálogo revisado e ampliado.
- As quatro alternativas são montadas a partir do catálogo completo do mesmo gênero, mesmo quando nem todas as faixas têm preview de áudio.
- O sorteio de músicas e da posição da resposta correta acontece no servidor com `node:crypto`, não com `Math.random()`.
- Antes de repetir uma música, o servidor tenta esgotar as faixas disponíveis do gênero escolhido.
- O algoritmo evita músicas iguais em sequência e tenta evitar o mesmo artista em rodadas consecutivas.


## V7 — Catálogo 1.000+

- Base local preservada: 520 músicas.
- Expansão automática com faixas reais e preview válido.
- Meta aproximada: 1.067 músicas quando a Deezer está disponível.
- Prioridade: Sertanejo, Acústico/Poesia, Trap, Funk e Modão.
- Limite por artista durante a expansão para aumentar a diversidade.
- Artistas de expansão ficam presos ao gênero configurado e resultados com artista incompatível são rejeitados.
- Faixas dinâmicas sem ano confiável não exibem um ano inventado na tela de resultado.

## V11 — Pop Internacional + Modo Artista

- Novo gênero **Pop Internacional**, com 80 faixas de fallback local e expansão automática para até ~300 faixas via previews disponíveis.
- Artistas internacionais contemplados na expansão incluem Taylor Swift, The Weeknd, Ariana Grande, Dua Lipa, Bruno Mars, Lady Gaga, Rihanna, Katy Perry, Justin Bieber, Billie Eilish, Olivia Rodrigo, Harry Styles, Ed Sheeran, Miley Cyrus, Adele, Sabrina Carpenter e outros.
- Nova aba **Artistas** na votação.
- Modos de artista iniciais: Henrique & Juliano, Jorge & Mateus, Marília Mendonça, Gusttavo Lima, Zé Neto & Cristiano, Matuê, Teto, Veigh, MC Kevin o Chris, Chitãozinho & Xororó, Taylor Swift e The Weeknd.
- Quando uma rodada vem de um Modo Artista, a música correta e as alternativas pertencem ao mesmo artista.
- Cada artista recebe um pool dedicado de até 30 faixas quando a fonte de previews disponibiliza esse volume.
- Misturadão passa a incluir também Pop Internacional, mas não injeta Modos Artista automaticamente.


## V12 — Samba, Reggae e votação sem tempo

- A escolha de gênero/artista não tem mais cronômetro.
- Todos podem alterar o voto até o Host iniciar a partida.
- O Host inicia somente depois que todos os jogadores conectados escolherem.
- A aba Artistas agora é organizada por estilo musical.
- Novas categorias: Samba / Pagode e Reggae Brasileiro, ambas com catálogo local e expansão própria.
