import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const episodePlots = [
  {
    numero_episodio: 1,
    trama:
      "Sedici anni dopo la morte del Patriarca di Yiling, Wei Wuxian torna in vita nel corpo di Mo Xuanyu grazie a un rituale sacrificale. Nel villaggio Mo si ritrova coinvolto in un caso di cadaveri animati e incrocia di nuovo Lan Wangji, cercando pero di nascondere la propria identita.",
    descrizione: "Wei Wuxian rinasce nel corpo di Mo Xuanyu e incontra Lan Wangji durante il mistero del villaggio Mo."
  },
  {
    numero_episodio: 2,
    trama:
      "A Dafan Mountain, Wei Wuxian incontra Jin Ling, Jiang Cheng e i discepoli dei clan Lan e Jin durante l'indagine su una statua che divora anime. Per salvare i giovani coltivatori, usa il flauto e richiama involontariamente Wen Ning, facendo nascere nuovi sospetti sulla sua vera identita.",
    descrizione: "A Dafan Mountain Wei Wuxian richiama Wen Ning e il racconto torna al passato."
  },
  {
    numero_episodio: 3,
    trama:
      "Il passato comincia con l'arrivo dei giovani del clan Jiang a Caiyi Town e poi ai Recessi della Nuvola. Wei Wuxian entra subito in conflitto con Lan Wangji per il suo carattere ribelle, mentre Wen Ruohan e Xue Yang iniziano a muoversi intorno ai frammenti del Ferro Stigio.",
    descrizione: "Nei flashback Wei Wuxian arriva ai Recessi della Nuvola e incontra il rigore di Lan Wangji."
  },
  {
    numero_episodio: 4,
    trama:
      "Durante la cerimonia di presentazione ai Recessi della Nuvola, il clan Wen irrompe con arroganza e fa crescere la tensione fra le grandi sette. Wei Wuxian nota i movimenti sospetti di Wen Qing e continua a provocare Lan Qiren, mostrando gia interesse per tecniche proibite.",
    descrizione: "La presenza del clan Wen incrina l'equilibrio ai Recessi della Nuvola."
  },
  {
    numero_episodio: 5,
    trama:
      "Punito nella biblioteca, Wei Wuxian tormenta Lan Wangji e stringe un legame ambiguo con lui tra scherzi e conflitti. Intanto il gruppo indaga sui demoni d'acqua del lago Biling, dove Wen Ning manifesta una condizione inquietante e Lan Wangji salva Wei Wuxian dal pericolo.",
    descrizione: "Wei Wuxian e Lan Wangji indagano sul lago Biling e scoprono segnali legati al clan Wen."
  },
  {
    numero_episodio: 6,
    trama:
      "Dopo una notte di vino proibito, Wei Wuxian e Lan Wangji vengono puniti e finiscono nella sorgente fredda. Trascinati in una grotta segreta, incontrano Lan Yi, ascoltano la storia del Ferro Stigio e ricevono un compito che lega il loro destino alla protezione di quel potere.",
    descrizione: "Nella grotta segreta Lan Yi rivela a Wei Wuxian e Lan Wangji il pericolo del Ferro Stigio."
  },
  {
    numero_episodio: 7,
    trama:
      "Lan Yi affida ai due giovani un frammento del Ferro Stigio, chiedendo loro di non ripetere gli errori del passato. Mentre il clan Wen cerca lo stesso potere, una lite tra Wei Wuxian e Jin Zixuan porta alla rottura del fidanzamento con Jiang Yanli.",
    descrizione: "Wei Wuxian e Lan Wangji custodiscono il Ferro Stigio mentre si rompe l'accordo matrimoniale di Jiang Yanli."
  },
  {
    numero_episodio: 8,
    trama:
      "Wen Chao minaccia il clan Lan e costringe Wei Wuxian a seguire Lan Wangji nella ricerca degli altri frammenti. A Dafan Mountain il gruppo cade in una trappola: la statua celeste si anima, i burattini invadono il tempio e la minaccia Wen diventa piu esplicita.",
    descrizione: "La ricerca del Ferro Stigio porta Wei Wuxian e Lan Wangji in una trappola a Dafan Mountain."
  },
  {
    numero_episodio: 9,
    trama:
      "Wen Qing salva il gruppo attirando via i burattini, ma continua a nascondere la verita sul legame fra il suo clan e la statua. Wei Wuxian, Lan Wangji, Jiang Cheng e Nie Huaisang arrivano poi a Yueyang, dove la scomparsa del clan Chang annuncia un nuovo massacro.",
    descrizione: "Dopo Dafan Mountain, il gruppo arriva a Yueyang e scopre la tragedia del clan Chang."
  },
  {
    numero_episodio: 10,
    trama:
      "Xue Yang viene smascherato come responsabile dello sterminio del clan Chang e catturato con l'aiuto di Xiao Xingchen e Song Lan. Nel Regno Impuro dei Nie, Meng Yao viene accusato di omicidio e cacciato, mentre il clan Wen minaccia apertamente Qinghe.",
    descrizione: "Xue Yang viene catturato e Meng Yao perde il suo posto nel clan Nie."
  },
  {
    numero_episodio: 11,
    trama:
      "Wei Wuxian e Jiang Cheng tornano a Lotus Pier, dove le tensioni familiari si intrecciano alla paura dell'espansione Wen. Nel frattempo i Wen bruciano i Recessi della Nuvola, feriscono Lan Wangji e costringono i giovani dei grandi clan a radunarsi a Nightless City.",
    descrizione: "Il clan Wen devasta i Recessi della Nuvola e la guerra diventa inevitabile."
  },
  {
    numero_episodio: 12,
    trama:
      "A Nightless City, Wen Chao umilia gli eredi dei clan rivali e punisce Wei Wuxian per la sua sfida. Wen Ning lo aiuta di nascosto quando viene rinchiuso con una bestia feroce, mentre una nuova missione sul monte Muxi mette tutti in pericolo.",
    descrizione: "Wen Chao umilia i giovani clan e Wei Wuxian viene salvato in segreto da Wen Ning."
  },
  {
    numero_episodio: 13,
    trama:
      "Sul monte Muxi, Wen Chao usa i giovani coltivatori come esca per una creatura mostruosa. Wei Wuxian protegge Mianmian subendo il marchio Wen, poi resta intrappolato nella grotta insieme a Lan Wangji per permettere agli altri di fuggire.",
    descrizione: "Wei Wuxian e Lan Wangji restano intrappolati con la bestia Xuanwu."
  },
  {
    numero_episodio: 14,
    trama:
      "Wei Wuxian e Lan Wangji affrontano Xuanwu of Slaughter con una strategia rischiosa. Durante lo scontro Wei Wuxian entra in contatto con una spada carica di energia rancorosa, primo segno della via oscura che cambiera il suo destino.",
    descrizione: "La battaglia contro Xuanwu espone Wei Wuxian a un potere oscuro."
  },
  {
    numero_episodio: 15,
    trama:
      "Wang Lingjiao arriva a Lotus Pier per punire Wei Wuxian e trasformare la casa Jiang in un ufficio di sorveglianza Wen. Yu Ziyuan reagisce, ma l'attacco Wen travolge il clan e costringe Jiang Cheng e Wei Wuxian a lasciare la propria casa.",
    descrizione: "L'attacco a Lotus Pier distrugge la sicurezza della famiglia Jiang."
  },
  {
    numero_episodio: 16,
    trama:
      "Wei Wuxian e Jiang Cheng tornano troppo tardi a Lotus Pier e trovano Jiang Fengmian e Yu Ziyuan morti. Devastati, i fratelli cercano di salvare Jiang Yanli e fuggire, mentre Wen Ning offre un aiuto inatteso fra le rovine del clan Jiang.",
    descrizione: "La caduta di Lotus Pier lascia Wei Wuxian e Jiang Cheng senza famiglia e senza casa."
  },
  {
    numero_episodio: 17,
    trama:
      "Wen Ning salva Jiang Cheng e porta i fratelli Jiang al sicuro da Wen Qing. La diagnosi rivela pero che Jiang Cheng ha perso il nucleo dorato: Wei Wuxian cerca disperatamente una cura e decide di pagare un prezzo enorme per restituirgli il futuro.",
    descrizione: "Jiang Cheng perde il nucleo dorato e Wei Wuxian sceglie un sacrificio radicale."
  },
  {
    numero_episodio: 18,
    trama:
      "Wei Wuxian organizza l'inganno che permettera a Jiang Cheng di credere di essere guarito da Baoshan Sanren. Mentre Jiang Yanli viene messa al sicuro, i clan rivali ai Wen danno inizio alla Campagna Sunshot contro il dominio di Qishan.",
    descrizione: "Wei Wuxian mette in moto il piano per salvare Jiang Cheng mentre nasce la Campagna Sunshot."
  },
  {
    numero_episodio: 19,
    trama:
      "Catturato da Wen Chao, Wei Wuxian viene torturato e gettato nei Burial Mounds, dove l'energia rancorosa lo trasforma. Tre mesi dopo, Jiang Cheng e Lan Wangji scoprono che potrebbe essere ancora vivo, mentre una presenza oscura comincia a vendicarsi dei Wen.",
    descrizione: "Wei Wuxian sopravvive ai Burial Mounds e rinasce attraverso la coltivazione oscura."
  },
  {
    numero_episodio: 20,
    trama:
      "Wei Wuxian torna irriconoscibile e usa il flauto per vendicarsi di Wang Lingjiao, Wen Zhuliu e Wen Chao. Il ricongiungimento con Jiang Cheng e Lan Wangji e freddo e doloroso: Lan Wangji teme che il nuovo potere lo consumi, ma Wei Wuxian rifiuta ogni ammonimento.",
    descrizione: "Wei Wuxian ritorna dai Burial Mounds e compie la sua vendetta sui Wen."
  },
  {
    numero_episodio: 21,
    trama:
      "Il ritorno di Wei Wuxian viene accolto con gioia dai fratelli Jiang, ma il suo rifiuto di usare la spada e la dipendenza dal flauto destano sospetti. Mentre Wen Ruohan prepara nuovi burattini, Lan Wangji cerca di capire se puo ancora aiutare l'amico.",
    descrizione: "Wei Wuxian torna tra i clan alleati, ma la sua nuova via spaventa chi gli sta vicino."
  },
  {
    numero_episodio: 22,
    trama:
      "Wei Wuxian accetta per un momento l'aiuto di Lan Wangji, ma la guerra contro i Wen precipita. Durante l'assalto a Nightless City, Meng Yao si rivela decisivo dall'interno e Wei Wuxian usa i propri poteri per rovesciare i burattini contro Wen Ruohan.",
    descrizione: "La Campagna Sunshot arriva a Nightless City e Wei Wuxian usa il suo potere in battaglia."
  },
  {
    numero_episodio: 23,
    trama:
      "Wen Ruohan cade e la guerra finisce, ma la vittoria apre una nuova crisi morale: i superstiti Wen vengono perseguitati e Wei Wuxian si oppone alla loro esecuzione. Intanto Meng Yao rientra nel clan Jin come Jin Guangyao e stringe il patto dei Tre Zun.",
    descrizione: "La vittoria sui Wen lascia irrisolta la sorte dei sopravvissuti innocenti."
  },
  {
    numero_episodio: 24,
    trama:
      "I clan celebrano la fine della guerra mentre Jin Guangshan cerca di controllare Wei Wuxian e il Sigillo della Tigre Stigia. A Lotus Pier, i tre fratelli Jiang tentano di ricostruire la propria casa, ma il peso del comando e delle tecniche proibite li allontana.",
    descrizione: "Dopo la guerra, Lotus Pier rinasce ma Wei Wuxian resta sempre piu isolato."
  },
  {
    numero_episodio: 25,
    trama:
      "Alla caccia di Phoenix Mountain, Wei Wuxian dimostra ancora la sua superiorita ma scatena ostilita e paura. Difende Jiang Yanli dagli insulti dei Jin, mentre Jin Zixuan chiarisce finalmente i propri sentimenti e Wen Qing riappare in condizioni disperate.",
    descrizione: "La caccia di Phoenix Mountain mette Wei Wuxian al centro di nuove accuse e tensioni."
  },
  {
    numero_episodio: 26,
    trama:
      "Wei Wuxian affronta Jin Zixun per scoprire dove siano stati portati Wen Ning e gli altri Wen innocenti. A Qiongqi Path trova Wen Ning morto, lo richiama come cadavere feroce e decide di salvare i superstiti, pur sapendo che questo lo mettera contro tutti.",
    descrizione: "Wei Wuxian trova Wen Ning morto e sceglie di proteggere i superstiti Wen."
  },
  {
    numero_episodio: 27,
    trama:
      "Lan Wangji lascia andare Wei Wuxian e i Wen, mentre i clan riuniti lo condannano come minaccia. Jiang Cheng visita i Burial Mounds e scopre che Wei Wuxian protegge anziani, malati e bambini, ma i due fratelli non riescono piu a trovare una via comune.",
    descrizione: "Wei Wuxian viene giudicato dai clan mentre nei Burial Mounds protegge i Wen innocenti."
  },
  {
    numero_episodio: 28,
    trama:
      "Wei Wuxian chiede a Jiang Cheng di recidere formalmente il loro legame per salvare il clan Jiang dalle conseguenze delle sue scelte. A Yiling, un incontro quotidiano con Lan Wangji e Wen Yuan mostra la vita fragile che Wei Wuxian sta cercando di costruire.",
    descrizione: "Wei Wuxian rompe con il clan Jiang per proteggere i Wen e la reputazione di Jiang Cheng."
  },
  {
    numero_episodio: 29,
    trama:
      "Lan Wangji visita i Burial Mounds e vede da vicino la comunita che Wei Wuxian sta difendendo. Quando Wen Ning perde il controllo, i due riescono a fermarlo e a risvegliarne la coscienza, ma resta chiaro che la strada scelta da Wei Wuxian e instabile e solitaria.",
    descrizione: "Lan Wangji vede la vita nei Burial Mounds e aiuta Wei Wuxian a fermare Wen Ning."
  },
  {
    numero_episodio: 30,
    trama:
      "Jiang Yanli incontra Wei Wuxian in abito da sposa, dandogli la possibilita di condividere un ultimo momento familiare e scegliere il nome del futuro Jin Ling. Un anno dopo, la nascita del bambino riapre la questione se Wei Wuxian debba essere invitato alla celebrazione.",
    descrizione: "Wei Wuxian rivede Jiang Yanli prima delle nozze e poi riceve notizia della nascita di Jin Ling."
  },
  {
    numero_episodio: 31,
    trama:
      "Invitato alla celebrazione di Jin Ling, Wei Wuxian viene fermato a Qiongqi Path da Jin Zixun, che lo accusa di averlo maledetto. Lo scontro degenera: Wei Wuxian perde il controllo di Wen Ning, Jin Zixuan viene ucciso e Wen Qing sceglie di consegnarsi per proteggerlo.",
    descrizione: "A Qiongqi Path la morte di Jin Zixuan trasforma Wei Wuxian nel bersaglio definitivo dei clan."
  },
  {
    numero_episodio: 32,
    trama:
      "Sconvolto dalla perdita di Wen Qing e Wen Ning, Wei Wuxian irrompe a Nightless City durante la cerimonia dei clan. Le accuse e la distruzione delle ceneri dei Wen lo spingono oltre il limite, e la battaglia culmina nella morte di Jiang Yanli davanti ai suoi occhi.",
    descrizione: "Nightless City precipita nel caos e Jiang Yanli muore cercando Wei Wuxian."
  },
  {
    numero_episodio: 33,
    trama:
      "Dopo la morte di Jiang Yanli, Wei Wuxian perde ogni controllo e spezza il Sigillo della Tigre Stigia pur di impedirne il possesso. Sull'orlo del precipizio Lan Wangji tenta di salvarlo, ma Wei Wuxian si lascia cadere; sedici anni dopo si risveglia accanto a lui.",
    descrizione: "Wei Wuxian cade a Nightless City e, sedici anni dopo, riprende il cammino con Lan Wangji."
  },
  {
    numero_episodio: 34,
    trama:
      "Nel presente, Wei Wuxian e Lan Wangji indagano sul crinale di Xinglu e salvano Jin Ling da una tomba piena di spade. Jiang Cheng riconosce Wei Wuxian sotto l'identita di Mo Xuanyu, riaprendo ferite che non si sono mai chiuse.",
    descrizione: "Wei Wuxian e Lan Wangji salvano Jin Ling e Jiang Cheng scopre la verita sul ritorno di Wei Wuxian."
  },
  {
    numero_episodio: 35,
    trama:
      "L'indagine sulla tomba conduce a Nie Huaisang e al sospetto che la spada Baxia di Nie Mingjue sia legata al mistero. Wei Wuxian e Lan Wangji seguono la traccia verso Yueyang, dove riaffiorano i nomi di Xiao Xingchen, Song Lan e Xue Yang.",
    descrizione: "La pista della spada conduce Wei Wuxian e Lan Wangji verso il caso di Yi City."
  },
  {
    numero_episodio: 36,
    trama:
      "Wei Wuxian libera Wen Ning dai chiodi che ne sigillavano la coscienza e scopre nuovi indizi sul Sigillo della Tigre Stigia ricreato. Con Lan Wangji arriva a Yi City, dove nebbia, cadaveri feroci e burattini di carta introducono un mistero piu oscuro.",
    descrizione: "Wen Ning si risveglia e il gruppo entra nella nebbia di Yi City."
  },
  {
    numero_episodio: 37,
    trama:
      "A Yi City, Wei Wuxian cura i giovani discepoli avvelenati e riconosce Xiao Xingchen, ma l'apparenza e un inganno. Xue Yang si rivela dietro la maschera, mentre il vero corpo di Xiao Xingchen viene trovato in una casa di bare.",
    descrizione: "Xue Yang emerge come burattinaio del mistero di Yi City."
  },
  {
    numero_episodio: 38,
    trama:
      "Attraverso l'empatia con A-Qing, Wei Wuxian rivive la tragedia di Yi City: Xiao Xingchen accolse Xue Yang senza riconoscerlo, mentre quest'ultimo manipolo la sua cecita e lo spinse a uccidere innocenti e perfino Song Lan.",
    descrizione: "I ricordi di A-Qing rivelano come Xue Yang distrusse Xiao Xingchen e Song Lan."
  },
  {
    numero_episodio: 39,
    trama:
      "Wei Wuxian e Lan Wangji affrontano Xue Yang, ma il misterioso uomo mascherato sottrae il mezzo Sigillo della Tigre Stigia. Dopo la fine di Xue Yang e la sepoltura di A-Qing, l'indagine porta al corpo smembrato di Nie Mingjue e al riconoscimento di Wei Wuxian da parte di Lan Xichen.",
    descrizione: "Il caso di Yi City si chiude e conduce al corpo di Nie Mingjue."
  },
  {
    numero_episodio: 40,
    trama:
      "Al Carp Tower, Wei Wuxian entra sotto la maschera di Mo Xuanyu per cercare la testa di Nie Mingjue. Trasformato in uomo di carta, spia Jin Guangyao, scopre Qin Su rinchiusa e trova la testa nascosta, avviando un'empatia sui ricordi di Nie Mingjue.",
    descrizione: "Wei Wuxian indaga nella stanza segreta di Jin Guangyao e trova la testa di Nie Mingjue."
  },
  {
    numero_episodio: 41,
    trama:
      "Nei ricordi di Nie Mingjue emerge il lungo tradimento di Jin Guangyao: umiliazioni, omicidi coperti, musica alterata e manipolazioni lo portarono alla deviazione del qi e alla decapitazione. Wei Wuxian fugge dalla stanza segreta con prove decisive.",
    descrizione: "L'empatia rivela il ruolo di Jin Guangyao nella morte di Nie Mingjue."
  },
  {
    numero_episodio: 42,
    trama:
      "Jin Guangyao lascia entrare gli altri nella stanza del tesoro, ma Qin Su muore davanti a tutti e Wei Wuxian viene smascherato usando SuiBian. Lan Wangji sceglie apertamente di restare al suo fianco, anche quando i due diventano bersaglio dei clan.",
    descrizione: "Wei Wuxian viene smascherato al Carp Tower e Lan Wangji lo difende senza esitazione."
  },
  {
    numero_episodio: 43,
    trama:
      "Ai Recessi della Nuvola, Wei Wuxian apprende il prezzo pagato da Lan Wangji dopo la sua morte e ricostruisce il ruolo della seconda melodia negli incidenti passati. Jin Guangyao tenta di spostare le accuse su di lui denunciando nuovi burattini nei Burial Mounds.",
    descrizione: "Wei Wuxian scopre le cicatrici di Lan Wangji e prepara una nuova indagine sui Burial Mounds."
  },
  {
    numero_episodio: 44,
    trama:
      "Wei Wuxian, Lan Wangji e Wen Ning tornano ai Burial Mounds, ormai distrutti, e trovano i giovani discepoli intrappolati. Quando i clan arrivano e accusano ancora Wei Wuxian, una nuova ondata di burattini costringe tutti a collaborare per sopravvivere.",
    descrizione: "Ai Burial Mounds le accuse contro Wei Wuxian si scontrano con un nuovo attacco di burattini."
  },
  {
    numero_episodio: 45,
    trama:
      "Wei Wuxian smaschera Su She come uomo mascherato, mentre Wen Ning riconosce in Lan Sizhui il bambino Wen Yuan. A Lotus Pier, le testimonianze di Si Si e Bi Cao rivelano crimini e segreti di Jin Guangyao, cambiando l'opinione dei clan.",
    descrizione: "Su She viene esposto e le testimonianze contro Jin Guangyao emergono a Lotus Pier."
  },
  {
    numero_episodio: 46,
    trama:
      "Le rivelazioni su Jin Guangyao spostano il giudizio dei clan, ma Jiang Cheng e Wei Wuxian si scontrano ancora davanti all'altare Jiang. Wen Ning rivela infine la verita piu dolorosa: il nucleo dorato di Jiang Cheng e quello sacrificato da Wei Wuxian anni prima.",
    descrizione: "Jiang Cheng scopre che il suo nucleo dorato apparteneva a Wei Wuxian."
  },
  {
    numero_episodio: 47,
    trama:
      "Wei Wuxian, Lan Wangji e Wen Ning seguono la pista fino al tempio di Yunping, dove Jin Guangyao tiene sotto controllo Lan Xichen e usa ostaggi per proteggersi. Jin Ling, Jiang Cheng e Nie Huaisang vengono coinvolti mentre la verita sepolta sotto il tempio sta per emergere.",
    descrizione: "Il confronto finale si apre nel tempio di Yunping, con Jin Guangyao pronto a tutto."
  },
  {
    numero_episodio: 48,
    trama:
      "Jiang Cheng e Wei Wuxian affrontano finalmente il dolore del passato e si avvicinano a una riconciliazione. Nel tempio viene ritrovato il corpo di Nie Mingjue e Wei Wuxian collega Su She, Jin Guangyao, la maledizione di Jin Zixun e il Sigillo della Tigre Stigia in un'unica trama.",
    descrizione: "Il tempio rivela il corpo di Nie Mingjue e il disegno criminale di Jin Guangyao."
  },
  {
    numero_episodio: 49,
    trama:
      "Jin Guangyao confessa parte dei suoi crimini, inclusa la manipolazione che porto alla morte di Jin Zixuan, ma tenta ancora di salvarsi usando Jin Ling come ostaggio. Baxia, il Sigillo della Tigre Stigia e il corpo di Nie Mingjue vengono sigillati insieme, mentre Nie Huaisang sembra orientare gli eventi nell'ombra.",
    descrizione: "Le confessioni di Jin Guangyao e il piano di Nie Huaisang portano il tempio al collasso morale."
  },
  {
    numero_episodio: 50,
    trama:
      "Jin Guangyao muore nel crollo del tempio dopo l'ultima rivelazione sul ruolo di Nie Huaisang. Con il rituale di Mo Xuanyu compiuto, Wei Wuxian si separa da Wen Ning e Lan Sizhui, riconosce che ognuno deve scegliere la propria strada e infine ritrova Lan Wangji sulle montagne.",
    descrizione: "Il caso si chiude, Lan Sizhui ritrova le sue origini e Wei Wuxian torna verso Lan Wangji."
  }
];

const env = readEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: series, error: seriesError } = await supabase
  .from("serie_tv")
  .select("id,titolo_originale,titolo_inglese")
  .or("titolo_originale.eq.陈情令,titolo_inglese.eq.The Untamed")
  .limit(1);

if (seriesError) {
  throw seriesError;
}

const theUntamed = series?.[0];

if (!theUntamed) {
  throw new Error("Serie The Untamed / 陈情令 non trovata nel database.");
}

let updated = 0;

for (const plot of episodePlots) {
  const { error } = await supabase
    .from("episodi")
    .update({
      sintesi_automatica: plot.trama,
      descrizione: plot.descrizione
    })
    .eq("serie_id", theUntamed.id)
    .eq("stagione", 1)
    .eq("numero_episodio", plot.numero_episodio);

  if (error) {
    throw error;
  }

  updated += 1;
}

const { count, error: countError } = await supabase
  .from("episodi")
  .select("*", { count: "exact", head: true })
  .eq("serie_id", theUntamed.id)
  .not("sintesi_automatica", "is", null);

if (countError) {
  throw countError;
}

console.log(
  JSON.stringify(
    {
      serie_id: theUntamed.id,
      plots_updated: updated,
      episodes_with_plot: count
    },
    null,
    2
  )
);
