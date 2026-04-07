# Casa dos 20 — Guia de Publicação nas Stores

## O que foi preparado

O projeto agora tem tudo configurado com **Capacitor** para gerar apps nativos:
- `android/` — Projeto Android Studio pronto
- `ios/` — Projeto Xcode pronto
- `capacitor.config.ts` — Configuração central
- `scripts/build-mobile.sh` — Script de build

---

## Passo 1: Configurar o Servidor (Backend)

O app móvel precisa se conectar ao seu servidor. Antes de publicar:

1. **Publique o backend** no Replit (já está publicado) ou em outro servidor
2. Anote a URL do servidor (ex: `https://casados20.replit.app`)
3. Atualize `capacitor.config.ts` para apontar ao servidor:

```ts
server: {
  url: "https://casados20.replit.app",  // URL do seu servidor publicado
  androidScheme: "https",
  iosScheme: "https",
}
```

---

## Passo 2: Gerar os Ícones e Splash Screen

Você precisa de:
- **Ícone do app**: imagem 1024x1024 PNG (sem transparência para iOS)
- **Splash screen**: imagem 2732x2732 PNG (logo centralizada, fundo escuro #0a0a0a)

Use o site **https://capacitorjs.com/docs/guides/splash-screens-and-icons** ou a ferramenta:
```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#0a0a0a" --splashBackgroundColor "#0a0a0a"
```

Coloque os arquivos em:
- `assets/icon-only.png` (1024x1024)
- `assets/splash.png` (2732x2732)
- `assets/splash-dark.png` (2732x2732)

---

## Passo 3: Google Play (Android)

### Requisitos:
- Conta Google Play Developer (US$25, taxa única) — https://play.google.com/console
- Android Studio instalado no seu computador
- Java JDK 17+

### Passo a passo:

1. **Clone o projeto** para seu computador:
   ```bash
   git clone <url-do-replit> casados20
   cd casados20
   npm install
   ```

2. **Build o app**:
   ```bash
   npx vite build --outDir dist/public
   npx cap sync android
   npx cap open android
   ```

3. **No Android Studio**:
   - Menu: Build → Generate Signed Bundle/APK
   - Escolha "Android App Bundle" (AAB)
   - Crie uma keystore (guarde a senha em lugar seguro!)
   - Selecione "release" e clique "Create"

4. **No Google Play Console**:
   - Crie um novo app
   - Nome: "Casa dos 20"
   - Categoria: Livros e referências (ou Estilo de vida)
   - Upload o arquivo .aab gerado
   - Preencha: descrição, screenshots (mínimo 2), ícone, política de privacidade
   - Envie para revisão (leva 1-7 dias)

### Informações da ficha:
- **Nome**: Casa dos 20
- **Descrição curta**: Um refúgio para quem está atravessando a transição para a vida adulta.
- **Descrição longa**: Casa dos 20 é um espaço de reflexão e autoconhecimento baseado no livro de Quinzinho Oliveira. Com jornadas guiadas de 30 dias, cartas filosóficas, diário pessoal e check-ins emocionais, o app te acompanha na travessia dos 20 anos com calma e profundidade.
- **Categoria**: Livros e referências
- **Classificação**: Livre

---

## Passo 4: App Store (iOS)

### Requisitos:
- Conta Apple Developer (US$99/ano) — https://developer.apple.com
- Mac com Xcode 15+ instalado
- iPhone/iPad para teste (opcional, pode usar simulador)

### Passo a passo:

1. **No Mac**, clone o projeto:
   ```bash
   git clone <url-do-replit> casados20
   cd casados20
   npm install
   ```

2. **Build o app**:
   ```bash
   npx vite build --outDir dist/public
   npx cap sync ios
   npx cap open ios
   ```

3. **No Xcode**:
   - Selecione o target "App"
   - Em "Signing & Capabilities":
     - Team: Sua conta Apple Developer
     - Bundle Identifier: `com.casados20.app`
   - Selecione "Any iOS Device" como destino
   - Menu: Product → Archive
   - Na janela Organizer: Distribute App → App Store Connect

4. **No App Store Connect** (https://appstoreconnect.apple.com):
   - Crie um novo app
   - Bundle ID: `com.casados20.app`
   - Nome: Casa dos 20
   - Preencha: descrição, screenshots (iPhone 6.7" e 5.5"), palavras-chave
   - Selecione o build enviado pelo Xcode
   - Envie para revisão (leva 1-3 dias)

### Screenshots necessários:
- iPhone 6.7" (1290x2796) — mínimo 3
- iPhone 5.5" (1242x2208) — mínimo 3
- iPad 12.9" (2048x2732) — se suportar iPad

---

## Passo 5: Webhook do Stripe

Depois de publicar nas stores, atualize o webhook do Stripe:

1. Acesse https://dashboard.stripe.com/webhooks
2. Edite o webhook existente ou crie um novo
3. URL: `https://seu-dominio.com/api/stripe/webhook`
4. Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`

---

## Política de Privacidade

Ambas as stores exigem uma URL de política de privacidade. Crie uma página simples com:
- Quais dados são coletados (nome, email, dados do diário)
- Como os dados são usados (personalizar experiência)
- Pagamentos processados pelo Stripe
- Contato para dúvidas

---

## Resumo dos Custos

| Item | Custo |
|------|-------|
| Google Play Developer | US$25 (única vez) |
| Apple Developer | US$99/ano |
| Servidor (Replit) | Depende do plano |
| **Total inicial** | **~US$124** |

---

## Dúvidas Comuns

**P: Preciso de Mac para publicar na App Store?**
R: Sim, é obrigatório ter um Mac com Xcode para compilar o app iOS.

**P: Posso publicar só na Google Play primeiro?**
R: Sim! Muitos apps começam pela Google Play que é mais simples e barata.

**P: Quanto tempo leva a aprovação?**
R: Google Play: 1-7 dias. App Store: 1-3 dias (primeira vez pode demorar mais).

**P: Preciso atualizar o app a cada mudança no site?**
R: Se usar a configuração com URL do servidor (Passo 1), as mudanças no servidor refletem automaticamente. Só precisa atualizar o app nativo se mudar plugins ou configurações nativas.
