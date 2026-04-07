import { db } from "../server/db";
import { bookChapters } from "../shared/schema";
import { sql } from "drizzle-orm";

async function run() {
  const existing = await db.execute(sql`SELECT id FROM book_chapters WHERE page_type != 'chapter'`);
  if (existing.rows.length > 0) {
    console.log("Front matter já existe, pulando.");
    process.exit(0);
  }

  await db.insert(bookChapters).values([
    {
      order: -2,
      title: "Dedicatória",
      tag: "DEDICATÓRIA",
      excerpt: null,
      content: `Para todos os jovens que um dia sentiram que estavam ficando para trás.

Para quem acordou às 3 da manhã com o coração acelerado, sem saber ao certo por quê.

Para quem sorriu para o mundo enquanto carregava o peso da incerteza em silêncio.

Este livro é para você — que está no meio do caminho, tentando entender quem é, o que quer e onde vai chegar.

Você não está perdido. Você está em construção.`,
      isPreview: true,
      pageType: "front-matter",
    },
    {
      order: -1,
      title: "Introdução",
      tag: "INTRODUÇÃO",
      excerpt: "Uma carta para quem está vivendo os anos mais confusos e mais bonitos da vida.",
      content: `Olá.

Se você está a ler isto, provavelmente tem entre 17 e 30 anos — ou talvez já tenha passado dessa fase, mas ainda carrega dentro de si as cicatrizes e as perguntas que ela deixou.

Escrevi este livro porque senti falta de uma voz honesta. Uma voz que não prometesse que tudo iria ficar bem, mas que dissesse: "Eu entendo que agora é difícil, e está tudo bem sentir isso."

A casa dos 20 é essa fase estranha da vida em que você já não é criança, mas o mundo adulto ainda parece grande demais. É quando os planos que tinhas aos 15 anos começam a desmoronar — e você descobre que isso não é uma tragédia, é um recomeço.

Cada capítulo deste livro é uma reflexão. Não um manual, não uma receita. São pensamentos que escrevi nas noites em que eu mesmo me sentia perdido, nos dias em que a incerteza parecia maior do que eu.

Não precisa de ler em ordem. Abre numa página aleatória. Volta quando precisares. Sublinha o que fizer sentido para ti.

Este livro não tem todas as respostas. Mas talvez tenha as perguntas certas.

Com carinho,
Quinzinho Oliveira`,
      isPreview: true,
      pageType: "front-matter",
    },
  ]);

  console.log("✓ Dedicatória e Introdução adicionadas!");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
