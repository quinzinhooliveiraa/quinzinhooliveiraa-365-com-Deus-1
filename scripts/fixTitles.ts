import { db } from "../server/db";
import { bookChapters } from "../shared/schema";
import { eq } from "drizzle-orm";

// Titles extracted directly from PDF Sumário (pages 2-8)
const titles: Record<number, string> = {
  1:  "Abraçando a Incerteza: Uma Jornada para o Sucesso Colaborativo",
  2:  "Você já parou para pensar que a incerteza pode ser um presente inesperado em nossas vidas",
  3:  "Confie no esforço que você está disposto a colocar, pois é ele que transforma a incerteza em oportunidade",
  4:  "É na solidão que nos conhecemos, mas é nas interações com os outros que crescemos",
  5:  "Enfrentando a Solidão para Realizar Sonhos",
  6:  "Algumas pessoas estão destinadas a serem amadas apenas por um curto período de tempo",
  7:  "É normal se perder em alguém e ainda lutar para encontrar o seu caminho de volta",
  8:  "Solidão não é vazio, é uma oportunidade para se encontrar",
  9:  "Talvez a verdadeira liberdade esteja em escolher com sabedoria o que realmente importa",
  10: "Desvendando a Ansiedade: Entendendo o Que se Passa na Sua Mente",
  11: "Assumindo Quem Você Realmente É: Encarando o Medo de Não Ser Aceito",
  12: "Desafiando Imperfeições: Aceitação, Mudança e Empoderamento",
  13: "Você não pode se sentir confortável consigo mesmo se você não souber quem você é",
  14: "A Jornada da Excepcionalidade: Aceitando Sua Singularidade",
  15: "Desconectando-se das Ilusões das Redes Sociais",
  16: "Tornando-se a Pessoa Certa: O Caminho para o Verdadeiro Amor",
  17: "Desbravando o Oceano do Medo: Um Passo de Cada Vez",
  18: "Os Capítulos Inevitáveis da Vida",
  19: "Aqui está o que eles não te contam — você nunca vai realmente entender",
  20: "Desmascarando o Perfeccionismo: Ação, Não Ilusão",
  21: "A Armadilha do Autodesenvolvimento",
  22: "O Desconforto é na Verdade um Chamado para a Mudança",
  23: "Desvendando o Caminho Menos Percorrido",
  24: "Vivendo Leve: Aliviando o Sofrimento do Apego e das Expectativas",
  25: "Coisas para Fazer nos Seus Vinte Anos Além de Correr Atrás do Amor",
  26: "A última coisa que quer ouvir é encorajamento",
  27: "Não tenha medo de pedir ajuda",
  28: "Razões para relacionamentos acabarem",
  29: "Navegando Relacionamentos Unilaterais: Reconhecendo o Valor Próprio",
  30: "Se alguém quer estar na sua vida, essa pessoa estará",
  31: "Valorizando Amizades Inesquecíveis",
  32: "Reconectar-se consigo mesmo é a chave para superar a dependência",
  33: "Encontrar o verdadeiro sucesso não é apenas alcançar o topo da escada financeira, mas também saber quando parar, respirar e apreciar a vista ao longo do caminho",
  34: "Não minimize nem desvalorize seus sentimentos. Você tem todo o direito de sentir da maneira que sente",
  35: "Equilibrando o Presente e o Futuro: O Dilema de Investir e Curtir",
  36: "Como vou ganhar a vida: Isso tudo depende da sua definição de vida",
  37: "Desvendando a Cultura do Esforço: Uma Perspectiva Realista",
  38: "Viver a Vida: Além dos Prazeres Instantâneos",
  39: "Você não precisa resolver toda a sua vida hoje",
  40: "Estar rodeado das pessoas certas é clichê",
  41: "Lidando com Relações Tóxicas: Priorizando o Seu Bem-Estar",
  42: "Você está realmente curado ou apenas distraído",
  43: "Tirando a Máscara: Vencendo a Síndrome de Impostor",
  44: "Transformando Insultos em Oportunidades de Crescimento Pessoal",
  45: "Você é Mais do que Suas Comparações",
  46: "Aprendendo e Evoluindo: O Verdadeiro Sentido da Jornada",
  47: "Desacelerando para Apreciar a Jornada: a brevidade da vida e a importância de como usamos nosso tempo",
  48: "Descobrindo o Essencial em Meio ao Caos",
  49: "Vivendo Plenamente",
  50: "Como você passa seus vinte anos pode definir o seu futuro",
  51: "Encontrando Seu Próprio Caminho: Navegando Pelas Expectativas na Escolha de uma Carreira",
  52: "Sua Criatividade é Única",
  53: "A Solidão do Caminho Excepcional",
  54: "As diferentes maneiras de você se abandonar",
  55: "Você não está perdido. Você está apenas em um estágio desconfortável de sua vida, onde seu antigo eu se foi. Mas seu novo eu ainda não nasceu completamente",
  56: "Sem Pressa, Sem Prazos",
  57: "A pressão esmagadora para alcançar o sucesso de forma rápida",
  58: "Você não está onde quer estar. E está tudo bem",
  59: "Lidando com a Bagunça na Sua Mente",
  60: "Aqueles que te machucaram, eles mesmos estavam feridos, e não há nada que você possa fazer sobre esse fato",
  61: "As pessoas que o seu coração escolhe, mesmo quando pensa que é na hora errada, são simplesmente as pessoas erradas",
  62: "As pessoas temporárias em sua vida são suas lições",
  63: "Espero que você tenha a coragem de continuar amando profundamente em um mundo que às vezes falha em fazer isso",
  64: "Só porque alguém já foi uma parte importante da sua vida não significa que você precise se agarrar à amizade quando ela começa a morrer",
  65: "A Coragem de se Distanciar pelo Bem-Estar",
  66: "Crie espaço para pensar",
  67: "Desvendando o Vício Invisível: O Estresse Crônico Disfarçado",
  68: "Entendendo o Mental Breakdown",
  69: "No nosso próprio tempo",
  70: "O Poder Transformador dos Fracassos",
  71: "Perdoe-se",
  72: "Talvez, neste momento, sua jornada não seja sobre amor",
  73: "A Arte de Dizer Não: Preservando Compromissos e Prioridades",
  74: "Aqui vai uma verdade para quem acha que acumular conhecimento é suficiente para mudar a vida",
  75: "Desafiando a Ideia do Equilíbrio: Escolhendo Intencionalmente o Que Deixar de Lado",
  76: "O Verdadeiro Significado do Empreendedorismo",
  77: "Se você não está se envergonhando regularmente, não está se esforçando o suficiente",
  78: "O Valor de Manter Altos Padrões em um Mundo de Conformidade",
  79: "Assumindo o Controle: Protegendo-se de Manipulações",
  80: "O Impacto da Solidão nas Escolhas de Relacionamentos",
  81: "Você não deve afeto à sua família se eles estiverem sendo abusivos e tratando você mal",
  82: "Cuidando da sua Saúde Mental em um Mundo de Padrões Irreais",
  83: "Cumprir suas promessas é o primeiro passo para elevar sua autoestima",
  84: "Acredite na sua jornada, confie no seu tempo, você é o bastante",
};

async function run() {
  let updated = 0;
  for (const [orderStr, title] of Object.entries(titles)) {
    const order = Number(orderStr);
    await db.update(bookChapters)
      .set({ title })
      .where(eq(bookChapters.order, order));
    updated++;
  }
  console.log(`✓ ${updated} títulos actualizados com o casing correcto do Sumário do PDF`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
