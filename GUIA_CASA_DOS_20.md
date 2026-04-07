# Casa dos 20 — Guia Completo do Aplicativo

## O que é a Casa dos 20?

A Casa dos 20 é um aplicativo de autoconhecimento e reflexão para jovens entre 17 e 30 anos. É o complemento digital do livro "Casa dos 20" de Quinzinho Oliveira — um refúgio para quem está atravessando a transição para a vida adulta.

O app funciona como um espaço pessoal de calma, onde o utilizador pode refletir, escrever, acompanhar as suas emoções e participar em desafios de 30 dias alinhados com os temas do livro.

---

## Funcionalidades Principais

### 1. Check-in Emocional Diário
Ao abrir o app, o utilizador é convidado a registar como se sente naquele momento. Pode escolher entre estados como "Difícil", "Ansioso", "Calmo", "Grato", "Animado" ou "Solitário", e opcionalmente escrever um breve texto sobre o que está a sentir.

**Como funciona:** Com base neste check-in, o app personaliza todo o conteúdo daquele dia — a reflexão, as dicas e os lembretes são escolhidos de acordo com o estado emocional do utilizador. Se não fizer check-in, o app mostra uma reflexão do livro que muda automaticamente a cada dia.

### 2. Reflexão do Dia
Todos os dias o app apresenta uma reflexão personalizada. Pode ser uma frase do livro, uma dica prática, um lembrete motivacional ou uma pergunta provocadora.

**Como funciona:** O sistema analisa o check-in do dia (mood e palavras-chave) e seleciona a reflexão mais relevante. Entre reflexões igualmente relevantes, varia por dia — nunca repete a mesma. O utilizador pode ainda escrever uma reflexão pessoal a partir da frase do dia, que fica guardada no seu diário.

### 3. Diário / Journal
Um espaço de escrita pessoal com editor rico, onde o utilizador pode:
- Escrever textos livres com formatação
- Adicionar imagens e fotos
- Fazer desenhos à mão livre
- Usar voz-para-texto (falar em vez de escrever)
- Organizar entradas por categorias: Diário, Perguntas e Jornadas

**Como funciona:** As entradas são guardadas na conta do utilizador e podem ser editadas, arquivadas, eliminadas ou partilhadas. Utilizadores gratuitos têm limite de 15 entradas por mês; premium têm acesso ilimitado.

### 4. Perguntas / Jogo de Cartas
Um sistema de perguntas filosóficas inspiradas no livro, organizadas por temas (solidão, crescimento, propósito, etc.). Tem três modos:

- **Solo:** O utilizador tira cartas e reflete sozinho. Pode escrever respostas que são guardadas no diário.
- **Conversa a Dois:** Para usar com um amigo presencialmente, tirando cartas à vez.
- **Sala Multiplayer:** Cria uma sala com código, convida até 8 amigos, e jogam juntos em tempo real — cada um na vez tira uma carta e todos discutem.

**Como funciona:** As perguntas são selecionadas aleatoriamente com um sistema de peso, garantindo que o utilizador não vê as mesmas cartas repetidamente. O modo multiplayer funciona em tempo real via WebSocket.

### 5. Jornadas de 30 Dias
Desafios temáticos de 30 dias alinhados com os temas do livro. São 6 jornadas disponíveis:
- Autoconhecimento
- Propósito Profissional
- Conexão (Relações)
- Ansiedade (Incerteza)
- Crescimento
- Solidão

Cada dia traz uma atividade diferente: reflexão, ação prática, exercício de escrita, meditação, desafio ou leitura.

**Como funciona:**
- Na primeira vez, o utilizador faz um quiz de 8 perguntas que personaliza a ordem das jornadas de acordo com as suas necessidades.
- Só pode desbloquear a próxima jornada depois de completar a anterior.
- Cada dia só é acessível após a meia-noite do dia anterior (para manter o ritmo de 1 atividade por dia).
- Atividades de escrita ficam guardadas automaticamente no diário.
- Ao completar uma jornada, recebe um relatório personalizado gerado por inteligência artificial, analisando o seu progresso, pontos fortes e áreas de atenção.
- O progresso nunca é perdido, mesmo se o plano expirar.

### 6. Reflexões do Livro
Uma secção dedicada ao conteúdo do livro "Casa dos 20", com reflexões diárias, dicas práticas e lembretes. Funciona como um companheiro digital do livro físico.

### 7. Notificações Push
O app envia notificações para lembrar o utilizador de fazer o check-in diário, completar atividades das jornadas ou simplesmente enviar uma mensagem motivacional.

**Como funciona:** As notificações podem ser ativadas/desativadas pelo utilizador. O administrador pode agendar notificações recorrentes (a cada 6h, 12h, diariamente, etc.) com mensagens personalizadas. Funciona tanto no navegador (PWA) como em apps nativos (iOS/Android).

### 8. Voz-para-Texto
Em qualquer campo de escrita do app, o utilizador pode tocar no ícone de microfone e falar em vez de escrever. O app converte a fala em texto automaticamente em português do Brasil.

### 9. Partilha de Conteúdo
As reflexões do dia e lembretes podem ser partilhados como imagens bonitas nas redes sociais. O utilizador escolhe entre temas visuais (claro, escuro, etc.) e gera uma imagem pronta para Instagram, WhatsApp, etc.

---

## Modelo de Negócio (Freemium)

### Grátis
- Check-in emocional diário
- Reflexão do dia personalizada
- Perguntas no modo Solo e Conversa (5 por tema)
- Diário com limite de 15 entradas/mês
- Pode entrar em salas multiplayer criadas por outros

### Premium (R$9,90/mês ou R$79,90/ano)
- Tudo do plano grátis, sem limites
- Jornadas de 30 dias completas
- Diário ilimitado
- Jogo de cartas modo multiplayer (criar salas)
- Relatório de IA ao final de cada jornada
- 14 dias de trial grátis para novos utilizadores

---

## Registo e Acesso

O utilizador pode criar conta de duas formas:
- **Email e password** — recebe um email de verificação antes de poder usar o app
- **Google Sign-In** — entra com um clique, sem necessidade de verificação

Ao criar conta, passa por um onboarding que apresenta cada funcionalidade do app e oferece o trial de 14 dias.

---

## Plataformas

- **Web (PWA):** Funciona em qualquer navegador. Pode ser "instalado" no telemóvel direto do navegador, aparecendo como um ícone na tela inicial com experiência de app nativo.
- **iOS e Android:** Projetos nativos configurados com Capacitor, prontos para publicação na App Store e Google Play.

---

## Painel de Administração

O administrador tem acesso a um painel completo com:
- Estatísticas de utilizadores (total, ativos, premium, trial)
- Gestão de utilizadores (busca, filtros, conceder/revogar premium, bloquear/desbloquear)
- Tickets de feedback dos utilizadores
- Envio de notificações push para todos
- Agendamento de notificações recorrentes
- Convidar novos utilizadores

---

## Dados e Privacidade

- Todos os dados são armazenados de forma segura num banco de dados PostgreSQL
- Passwords são encriptadas com algoritmo scrypt
- Sessões são geridas de forma segura no servidor
- O app funciona offline graças ao service worker (mostra conteúdo em cache quando não há internet)

---

## Resumo em Uma Frase

A Casa dos 20 é o companheiro digital do livro — um espaço seguro onde jovens podem refletir, escrever, acompanhar as suas emoções e crescer através de desafios diários, tudo personalizado com base em como se sentem.
