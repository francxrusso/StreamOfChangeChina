import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const env = readEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SOURCES = {
  yiPuErZhu:
    "Fonti immagini/personaggi: Wikipedia zh 一仆二主; Sina photo album 一仆二主; 文汇报 still 一仆二主.",
  yaoChineseTales:
    "Fonti immagini/personaggi: Wikipedia zh 中国奇谭; CCTV/BJNews/Sina coverage 中国奇谭.",
  daddyLoong:
    "Fonti immagini/personaggi: TopMarketing/网易文创敖夜工作室 coverage; InCG Hu Creates Studio coverage; Bilibili/iQIYI Daddy Loong pages."
};

const IMAGES = {
  yiPoster: "https://upload.wikimedia.org/wikipedia/zh/f/f4/%E4%B8%80%E4%BB%86%E4%BA%8C%E4%B8%BB.jpg",
  yiYangShu: "https://whb-oss.oss-cn-shanghai.aliyuncs.com/u/cms/www/201409/09080432ba7c.jpg",
  yiTangHongLanJie: "https://k.sinaimg.cn/www/dy/slidenews/4_img/2014_12/704_1268166_457894.jpg/w640slw.jpg",
  yiScene2: "https://k.sinaimg.cn/www/dy/slidenews/4_img/2014_12/704_1268169_713186.jpg/w640slw.jpg",
  yiScene3: "https://k.sinaimg.cn/www/dy/slidenews/4_img/2014_12/704_1268171_941597.jpg/w640slw.jpg",
  yaoGroup: "https://n.sinaimg.cn/spider20230317/490/w767h523/20230317/e58f-f2bc08ceb35e0f767b3818ee4122918b.jpg",
  yaoLinlin: "https://k.sinaimg.cn/n/sinakd20110/160/w1024h1536/20230110/bfad-5dff357ad71a23d6293ab357a772a756.jpg/w700d1q75cms.jpg?by=cms_fixed_width",
  yaoBus: "https://n.sinaimg.cn/spider20230317/579/w768h611/20230317/4589-5dd7c668df893ad8b1a751fdfc8e8b45.jpg",
  yaoJadeRabbit: "https://p5.img.cctvpic.com/photoworkspace/contentimg/2023/02/16/2023021606335972443.jpg",
  yaoGoose: "https://n.sinaimg.cn/spider20230317/419/w768h451/20230317/40f4-83fbc30dea164626f3aa6e2cbc035505.jpg",
  daddyFamily: "https://www.itopmarketing.com/uploads/image/20230726/1690357691812913.png",
  daddyDragonDad: "https://www.itopmarketing.com/uploads/image/20230726/1690357686540780.png",
  daddyDragonMom: "https://www.itopmarketing.com/uploads/image/20230726/1690357677127189.png",
  daddyDongdong: "https://www.incgmedia.com/images/easyblog_articles/3179/b2ap3_large_IP.png"
};

const YI_IMAGES_BY_CHARACTER = {
  杨树: IMAGES.yiYangShu,
  唐红: IMAGES.yiTangHongLanJie,
  顾菁菁: IMAGES.yiPoster,
  蓝姐: IMAGES.yiTangHongLanJie,
  杨树苗: IMAGES.yiScene2,
  孟来财: IMAGES.yiScene3,
  孟小玉: IMAGES.yiScene2,
  林西北: IMAGES.yiScene3
};

const YAO_IMAGES_BY_CHARACTER = {
  小猪妖: IMAGES.yaoGroup,
  猩猩怪: IMAGES.yaoGroup,
  蛤蟆精: IMAGES.yaoGroup,
  黄鼠狼精: IMAGES.yaoGroup,
  货郎: IMAGES.yaoGoose,
  林林: IMAGES.yaoLinlin,
  王孩儿: IMAGES.yaoBus,
  神仙: IMAGES.yaoBus,
  玉兔: IMAGES.yaoJadeRabbit,
  小满: IMAGES.yaoGroup,
  小雪: IMAGES.yaoGroup,
  飞鸟: IMAGES.yaoGroup,
  鱼: IMAGES.yaoGroup,
  耳中人: IMAGES.yaoGroup,
  大鸟: IMAGES.yaoGroup,
  大贵人: IMAGES.yaoGroup,
  三郎: IMAGES.yaoGroup,
  三条龙: IMAGES.yaoGroup,
  刑天: IMAGES.yaoGroup
};

const DADDY_LOONG_CHARACTERS = [
  {
    nome_originale: "龙爸",
    nome_pinyin: "long ba",
    nome_italiano: "Papa drago",
    genere: "Maschile",
    fascia_eta: "Adulto",
    lavoro: "Padre / lavoratore",
    immagine_rappresentativa: IMAGES.daddyDragonDad,
    descrizione:
      "Il padre drago della famiglia: un drago di mezza eta che vive nella societa umana e affronta lavoro, famiglia e quotidianita con tono comico e affettuoso."
  },
  {
    nome_originale: "龙妈",
    nome_pinyin: "long ma",
    nome_italiano: "Mamma drago",
    genere: "Femminile",
    fascia_eta: "Adulta",
    lavoro: "Madre",
    immagine_rappresentativa: IMAGES.daddyDragonMom,
    descrizione:
      "La madre della famiglia, figura affettuosa e quotidiana accanto a 龙爸 e 东东 nelle storie domestiche di Daddy Loong."
  },
  {
    nome_originale: "东东",
    nome_pinyin: "dong dong",
    nome_italiano: "Dongdong",
    genere: "Maschile",
    fascia_eta: "Bambino",
    lavoro: "Bambino",
    immagine_rappresentativa: IMAGES.daddyDongdong,
    descrizione:
      "Il figlio di 龙爸 e 龙妈: bambino curioso e vivace, centro delle dinamiche familiari dell'animazione."
  }
];

async function getSeriesMap() {
  const { data, error } = await supabase
    .from("serie_tv")
    .select("id,titolo_originale")
    .in("titolo_originale", ["一仆二主", "中国奇谭", "我的爸爸是条龙"]);

  if (error) throw error;

  const map = new Map(data.map((serie) => [serie.titolo_originale, serie.id]));
  for (const title of ["一仆二主", "中国奇谭", "我的爸爸是条龙"]) {
    if (!map.has(title)) {
      throw new Error(`Serie non trovata: ${title}`);
    }
  }

  return map;
}

async function updateImagesForSerie(serieId, imagesByCharacter, fallbackImage, sourceNote) {
  const { data, error } = await supabase.from("personaggi").select("id,nome_originale,note_admin").eq("serie_id", serieId);
  if (error) throw error;

  let updated = 0;
  for (const character of data ?? []) {
    const image = imagesByCharacter[character.nome_originale] ?? fallbackImage;
    const note = [character.note_admin, sourceNote].filter(Boolean).join(" ");
    const { error: updateError } = await supabase
      .from("personaggi")
      .update({ immagine_rappresentativa: image, note_admin: note })
      .eq("id", character.id);

    if (updateError) throw updateError;
    updated += 1;
  }

  return updated;
}

async function replaceDaddyLoongCharacters(serieId) {
  const { error: deleteError } = await supabase.from("personaggi").delete().eq("serie_id", serieId);
  if (deleteError) throw deleteError;

  const payload = DADDY_LOONG_CHARACTERS.map((character) => ({
    ...character,
    serie_id: serieId,
    note_admin: SOURCES.daddyLoong,
    visibility: "public"
  }));

  const { error: insertError } = await supabase.from("personaggi").insert(payload);
  if (insertError) throw insertError;

  return payload.length;
}

async function main() {
  const series = await getSeriesMap();
  const yiCount = await updateImagesForSerie(series.get("一仆二主"), YI_IMAGES_BY_CHARACTER, IMAGES.yiPoster, SOURCES.yiPuErZhu);
  const yaoCount = await updateImagesForSerie(series.get("中国奇谭"), YAO_IMAGES_BY_CHARACTER, IMAGES.yaoGroup, SOURCES.yaoChineseTales);
  const daddyCount = await replaceDaddyLoongCharacters(series.get("我的爸爸是条龙"));

  console.log(
    JSON.stringify(
      {
        updated: {
          "一仆二主": yiCount,
          "中国奇谭": yaoCount,
          "我的爸爸是条龙": daddyCount
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
