import { db } from "../server/db";
import { bookChapters } from "../shared/schema";
import { eq } from "drizzle-orm";

const fixes = [
  {
    id: 19,
    title: "OS CAPÍTULOS INEVITÁVEIS DA VIDA",
    content: "A verdade é que você não pode pular certos capítulos em sua vida. Às vezes, você tem que experimentar o amor errado para aprender a lutar pelo seu coração, para aprender a reconhecer o amor certo quando ele aparecer em seu caminho. Às vezes, você tem que ficar sozinho, você tem que se curar em silêncio, para não permitir que suas feridas do passado o impeçam de receber tudo o que você merece nesta vida. Às vezes, você tem que escolher o caminho errado, você tem que cometer o erro, para realmente perceber que até os tropeços, até as rejeições, foram realmente apenas redirecionamentos. Às vezes, você tem que perder tudo o que esperava para si mesmo, tudo o que achava que queria, para desenterrar tudo o que realmente precisa, para abrir espaço em sua vida para as coisas certas se desdobrarem. Lembre-se: tudo o que você já considerou um fracasso foi realmente apenas uma oportunidade para florescer. Tudo o que você já considerou um erro foi realmente apenas uma oportunidade para se expandir na vida que você sempre foi destinado a viver, no tipo de amor, carreira e felicidade que sempre foram destinados a ser seus.",
  },
  {
    id: 20,
    title: "AQUI ESTÁ O QUE ELES NÃO TE CONTAM",
    content: "Você nunca vai entender completamente o mundo, nem por que as coisas aconteceram como aconteceram. Em vez disso, você vai aprender a seguir em frente, dia após dia. Descobrirá qual café da manhã gosta de tomar, que tipo de pessoas deseja ter ao seu lado. Encontrará os lugares que fazem sua alma se sentir em casa, e às vezes esses lugares serão pessoas. Descobrirá o que desperta sua paixão, as coisas que pode se ver fazendo todos os dias, por dez, vinte ou trinta anos. Aprenderá a dizer não e a se defender. Aprenderá a perdoar e a deixar ir. Aprenderá a se afastar, a se curar. Aprenderá a viver consigo mesmo, a ser seu próprio companheiro. Aprenderá a ser gentil, mesmo com as partes mais quebradas de si mesmo. Veja, você aprenderá a abraçar a vida. A aceitá-la verdadeiramente, como ela é. Nem sempre será fácil ou simples; nem sempre fará sentido, e você nem sempre terá controle. Mas será sua vida.",
  },
  {
    id: 27,
    title: "A ÚLTIMA COISA QUE QUER OUVIR É ENCORAJAMENTO",
    content: "Eu sei que quando você está passando por algo difícil, a última coisa que quer ouvir é encorajamento. Eu sei que é quase impossível pensar positivamente quando tudo tem sido negativo por muito tempo. Nesses momentos, saiba que está tudo bem fechar o livro. Está tudo bem desligar o otimismo. Está tudo bem apenas sentar e se distrair. Às vezes, nossas mentes simplesmente precisam de silêncio por um tempo. Mas espero que não se esqueça de voltar quando estiver pronto e tentar se encher de algo bom, com algo que lembre a esperança que você está esquecendo que está próxima, porque a esperança está sempre aqui. Lembre-se de uma boa lembrança. Lembre-se de que mesmo que não se sinta pronto para se curar, você é sempre mais capaz do que pensa que é. Você realmente está sempre se saindo melhor do que pensa que está.",
  },
  {
    id: 29,
    title: "RAZÕES PARA RELACIONAMENTOS ACABAREM",
    content: "Divergência nos caminhos. Por parecer bom demais para ser verdade. Por autossabotagem. Por descobrir que não eram quem você pensava que eram. Por não ser quem eles pensavam que você era. Por ressentimento. Por medo. Por ciúmes. Por causa de fusos horários diferentes. Por pararem de tentar. Falta de comunicação. Por ser difícil conciliar dois corações. Por solidão. Porque coisas bonitas são geralmente as mais frágeis. Pois a vida é complicada. Por desonestidade. Por orgulho. Por tédio. Pois as pessoas mudam de ideia. Por incompatibilidade. Por escolhermos nós mesmos. Por querermos coisas diferentes. Por as coisas ficarem sérias depressa demais. Por aceitar a realidade. Por recusa. Nem sempre temos escolha. Pois nem todo amor está destinado a crescer. Por fé. Por gentileza. Por termos alguém novo para conhecer. Porque eles também têm alguém novo para conhecer. Porque ainda temos esperança de amar novamente.",
  },
  {
    id: 32,
    title: "VALORIZANDO AMIZADES INESQUECÍVEIS",
    content: "Ao longo da vida, experimentamos muitos tipos diferentes de amizades. Em raras ocasiões, encontramos alguém tão especial que simplesmente sabemos que nos encontramos por um motivo. Esses são os tipos de amizades que duram para sempre, não importa em que cidade você mora ou com que frequência fala, não importa o quanto envelheça ou em que fase da vida esteja. É o tipo de amizade que não julga e permanece ao seu lado mesmo quando você comete erros. É o tipo de amizade que faz você entender o amor incondicional. Talvez você tenha conhecido seu amigo mais especial quando tinha 6, 13 ou 16 anos... ou talvez ainda esteja para cruzar seus caminhos. Isso acontece em estágios diferentes para pessoas diferentes. Mas quando acontece, não há conforto maior do que saber que essa pessoa estará ao seu lado para compartilhar a felicidade, a tristeza e tudo mais que estiver entre elas. Nunca, jamais dê essas amizades como garantidas.",
  },
  {
    id: 40,
    title: "VOCÊ NÃO PRECISA RESOLVER TODA A SUA VIDA HOJE",
    content: "Não precisa pensar no amanhã ou na próxima semana ou nos próximos três meses. Tudo o que precisa fazer é passar por hoje. Eu sei que você se sente impotente, desesperado e assustado. Mas também sei que, se olhar para o passado, verá muitas evidências de que é mais capaz do que pensa. Evidências de que você é incrivelmente resiliente, corajoso e criativo com o seu autocuidado. Evidências de que sempre encontra um caminho. De que sempre acaba onde precisa estar. De que sobreviveu a cada momento difícil e decisão até este ponto, e que pode sobreviver a este também. As coisas podem ser dolorosas e difíceis por um longo tempo, mas sua vida não precisa ser perfeita para ser significativa e valiosa. Você pode se sentir desconfortável, assustado e sobrecarregado e mesmo assim viver a vida.",
  },
  {
    id: 50,
    title: "VIVENDO PLENAMENTE",
    content: "Você pode acreditar que viver intensamente significa visitar todos os países do mundo, largar o emprego impulsivamente e se apaixonar de forma imprudente, mas na verdade, é apenas saber estar onde seus pés estão. É aprender a cuidar de si mesmo, a construir um lar dentro da sua própria pele. É aprender a construir uma vida da qual você se orgulha. Uma vida plenamente vivida nem sempre é composta pelas coisas que o deixam acordado à noite, mas por aquelas que lentamente lhe asseguram que está tudo bem em desacelerar. Que você não precisa provar-se constantemente. Que não precisa lutar para sempre, ou sempre querer mais. Aos poucos, você começará a perceber que a vida só pode crescer para fora na mesma proporção em que está estável por dentro — que se a alegria não estiver nas pequenas coisas primeiro, as grandes coisas não nos encontrarão completamente.",
  },
  {
    id: 53,
    title: "SUA CRIATIVIDADE É ÚNICA",
    content: "Não se preocupe tanto com as pessoas que imitam o seu trabalho. Elas conhecem apenas o \"o quê\", não o \"porquê\". Se você parar de ser criativo, elas também pararão, afinal, uma fotocopiadora não é uma artista, mesmo que consiga recriar a Mona Lisa. Elas dependem de você para existir, mas você não depende delas. O verdadeiro temor deveria ser quando ninguém mais o copia. Esse é um cenário muito mais assustador do que todos estarem copiando você. As pessoas podem copiar o que veem, mas não conseguirão replicar o que não entendem, ou seja, o motivo pelo qual cada peça está no lugar. Quando algo mudar no futuro, elas não poderão evoluir a partir dali, pois não sabem por que estava lá inicialmente. Então, lembre-se, a sua criatividade é única e valiosa. Não se prenda à preocupação com imitações; em vez disso, concentre-se em continuar evoluindo, porque é justamente a compreensão do \"porquê\" que torna o seu trabalho inimitável e extraordinário.",
  },
  {
    id: 55,
    title: "AS DIFERENTES MANEIRAS DE VOCÊ SE ABANDONAR",
    content: "Dizer \"sim\" quando você quer dizer \"não\". Pedir desculpas para alguém que lhe deve desculpas. Insistir em um erro mesmo sabendo que está errado. Explicar demais a sua verdade para alguém que parou de ouvir há muito tempo. Romantizar o mínimo. Implorar por um mínimo de consideração. Seguir pessoas que não desejam ser alcançadas. Construir uma vida baseada no que você pensa parecer \"bom\", mas não no que realmente é bom. Ignorar sua intuição. Ignorar seu corpo. Ignorar suas necessidades. Forçar-se a se encaixar em situações que você já superou. Permanecer em um relacionamento que já seguiu seu curso. Não permitir tempo para descanso profundo. Usar hábitos nocivos como uma fuga ou refúgio. Ficar quieto quando alguém te desrespeita. Recusar-se a aceitar o que já está presente. Mentir para si mesmo. Nunca pedir ajuda. Nunca se arriscar. Nunca viver de acordo com sua própria palavra. Valorizar aqueles que apenas toleram sua presença. Desejar ser outra pessoa.",
  },
  {
    id: 57,
    title: "SEM PRESSA, SEM PRAZOS",
    content: "Ouça—você vai encontrar as coisas que te fazem sentir livre na vida. Você vai se apaixonar profundamente—por outro ser humano e por si mesmo. Você vai descobrir as coisas que te enchem de propósito, as coisas que fazem você querer se levantar todas as manhãs. Você vai sentir a esperança surgindo em meio a toda escuridão dentro de você, você vai descobrir toda essa luz. Você vai ficar bem. Você vai entender as coisas. Mas você precisa entender que não há um cronograma definido para esse tipo de descoberta, não há uma lista de verificação para esse tipo de crescimento. Você pode se apaixonar amanhã, ou pode se apaixonar daqui a dez anos. Você pode descobrir sua paixão no dia seguinte à sua formatura, ou pode ter cinquenta anos antes de finalmente encontrar aquilo que faz seu coração palpitar de felicidade. Seja o que for, apenas dê tempo ao tempo. Seja gentil consigo mesmo; não apresse a maneira como você se transforma na pessoa que está se tornando. Não se apresse para preencher sua vida com coisas que não são para você apenas porque sente que está ficando para trás. Você não está ficando para trás—você está se encontrando. Então, por favor, continue. Tudo o que é para ser seu será seu.",
  },
  {
    id: 59,
    title: "VOCÊ NÃO ESTÁ ONDE QUER ESTAR. E ESTÁ TUDO BEM",
    content: "Você não é um fracasso porque está levando tanto tempo ou porque está lutando apenas para começar. Você não é fraco ou incapaz. Você é humano. Este trabalho é difícil. É desconfortável, fisicamente e mentalmente cansativo e aterrorizante, e faz sentido que leve tempo. Faz sentido que seja uma luta. Você não precisa resolver toda a sua vida da noite para o dia. E não precisa se envergonhar por estar onde está. Tudo o que você precisa se concentrar é em uma pequena coisa que pode fazer hoje para se aproximar de onde quer estar. Lentamente e levemente, um passo de cada vez. Você pode chegar lá. Cada esforço que você faz se acumula ao longo do tempo. E você é capaz de fazer esse trabalho. Todos começam em algum lugar. Este é o seu ponto de partida agora. Isso não significa que você ficará aqui para sempre. Não significa que você está preso. Apenas significa que este é o seu lugar hoje. Então respire e confie que está tudo bem estar aqui hoje. Confie que algo melhor está por vir. Confie que você tem o que é preciso para chegar lá.",
  },
  {
    id: 72,
    title: "PERDOE-SE",
    content: "Perdoe-se pela forma como tratou a si mesmo no passado. Pela forma como falou com o seu corpo. Pelo modo como desvalorizou o funcionamento da sua mente ao lidar com ansiedade, excesso de pensamentos, depressão ou qualquer coisa que o assombrasse. Perdoe-se pela maneira como se contentou com menos do que queria, desejava ou sabia que precisava, porque não achava que merecia; porque, em algum momento, convenceu-se de que não era digno de beleza na vida, não era digno de felicidade, bondade ou de ver suas aspirações concretizadas. Perdoe-se pela forma como se segurou porque não acreditava em seu próprio potencial, porque não acreditava em sua capacidade de ocupar espaço. Perdoe-se por todas as coisas que não disse, ou não vestiu, ou não fez porque tinha medo de como isso o faria parecer, porque tinha medo do que os outros poderiam pensar de você. Perdoe-se pela forma como não se mostrou para si mesmo. Pelas maneiras pelas quais se segurou, pelas maneiras pelas quais não percebeu o quanto você era digno. Pelas maneiras pelas quais se diminuiu.",
  },
];

async function run() {
  console.log(`Corrigindo ${fixes.length} capítulos...`);
  for (const fix of fixes) {
    await db.update(bookChapters)
      .set({ title: fix.title, content: fix.content })
      .where(eq(bookChapters.id, fix.id));
    console.log(`✓ id=${fix.id} → "${fix.title}"`);
  }
  console.log("Concluído!");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
