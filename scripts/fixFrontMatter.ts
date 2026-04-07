import { db } from "../server/db";
import { bookChapters } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  // 1. Update Introdução with real PDF text (pages 9-11), cleaned
  const introContent = [
    // Page 9
    `Os filmes muitas vezes pintam um quadro irreal dos seus vinte anos, como se fossem o auge da sua existência, cheios de festas, luxo e dinheiro. Mas a realidade para a maioria das pessoas é diferente. Muitos estão pesadamente endividados, lutando para viver como nos filmes. Naturalmente, você vai se sentir desapontado. Eu entendo, porque muitas vezes me sinto assim também. Mas sabe de uma coisa? Seus vinte anos não precisam ser os melhores anos da sua vida. Eles não precisam ser os únicos em que você olha com saudade. Isso é uma escolha.

À medida que envelhecemos, a vida pode se tornar ainda melhor. Quanto mais você vive, mais você conhece a si mesmo, mais interessante você se torna por causa de todas as experiências que teve. Cometa muitos erros, aprenda com eles. Estamos todos apenas improvisando conforme vamos, esperando o melhor.

Ninguém tem a vida perfeita, e não existe uma fórmula secreta para a melhor vida possível. Algumas pessoas apenas sabem fazer parecer fácil, ou tiveram muitos privilégios. Então, pare de se cobrar tanto. Você tem toda uma vida pela frente, e este não é o único momento que vale a pena viver. Aproveite enquanto estiver aqui, faça coisas malucas, como aquela viagem com seus amigos. Afinal, você merece ter uma vida incrível.`,
    // Page 10
    `A vida é cheia de desafios. À medida que crescemos e nos tornamos adultos, enfrentamos questões como ansiedade, incerteza, autoaceitação, relacionamentos, saúde mental e muito mais.

Este livro é uma coleção de reflexões sobre esses desafios. Cada reflexão é uma oportunidade para você pensar sobre sua própria vida e como você pode lidar com os desafios que enfrenta.

As reflexões neste livro são de várias fontes, incluindo especialistas, pessoas comuns e até mesmo você mesmo. Elas são apresentadas de uma forma que o convida a pensar de forma mais tranquila e lógica sobre as coisas.

Espero que estas reflexões iluminem um ponto importante em sua vida. Talvez elas o ajudem a entender um problema que você está enfrentando, ou talvez elas o ajudem a encontrar uma nova perspectiva.

Não há respostas fáceis para os desafios da vida, mas as reflexões neste livro podem ajudá-lo a encontrar o seu próprio caminho.`,
    // Page 11
    `A reflexão é uma ferramenta poderosa que pode nos ajudar a crescer e amadurecer. Quando refletimos sobre nossas experiências, podemos começar a entender melhor quem somos e o que queremos da vida.

A reflexão pode nos ajudar a identificar nossos padrões de comportamento, desenvolver novos insights, tomar melhores decisões, resolver problemas e lidar com desafios.

Este livro pode ser usado de diversas maneiras. Você pode lê-lo de capa a capa, ou pode escolher os capítulos que são mais relevantes para você. Você também pode voltar e ler as reflexões novamente, conforme necessário.

Ao ler as reflexões neste livro, esteja aberto a novas ideias. Não tenha medo de questionar seus próprios pensamentos e crenças. E, acima de tudo, seja paciente consigo mesmo. O crescimento e o amadurecimento levam tempo.

Espero que você encontre neste livro inspiração e orientação para sua jornada.

Boa leitura!`
  ].join("\f");

  await db.update(bookChapters)
    .set({ content: introContent, pdfPage: 9 })
    .where(eq(bookChapters.order, -1));
  console.log("✓ Introdução actualizada (3 páginas do PDF)");

  // 2. Check if Sumário already exists
  const existing = await db.select({ id: bookChapters.id })
    .from(bookChapters)
    .where(eq(bookChapters.order, -3));

  if (existing.length > 0) {
    // Update
    await db.update(bookChapters)
      .set({
        title: "Sumário",
        pageType: "front-matter",
        content: "__TOC__",
        pdfPage: 2,
        isPreview: true,
      })
      .where(eq(bookChapters.order, -3));
    console.log("✓ Sumário actualizado");
  } else {
    // Insert
    await db.insert(bookChapters).values({
      order: -3,
      title: "Sumário",
      pageType: "front-matter",
      content: "__TOC__",
      pdfPage: 2,
      isPreview: true,
      tag: null,
      excerpt: null,
    } as any);
    console.log("✓ Sumário inserido");
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
