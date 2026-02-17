/**
 * NGワードフィルター
 * 表示名・bio・コメント・ユーザーハンドルに適用
 */

// NGワードリスト（ひらがな・カタカナ・漢字・英語）
const NG_WORDS: string[] = [
  // 差別・侮辱
  "死ね", "しね", "シネ",
  "殺す", "ころす", "コロス",
  "消えろ", "きえろ",
  "ガイジ", "がいじ",
  "池沼", "知障",
  "きちがい", "キチガイ", "基地外",
  "障害者", // コンテキスト次第だが一律ブロック
  "カタワ", "かたわ",
  "めくら", "メクラ",
  "つんぼ", "ツンボ",
  "びっこ", "ビッコ",
  "乞食", "こじき", "コジキ",
  "ニガー", "nigger", "nigga",
  "チョン", "チャンコロ",
  "土人",

  // 暴言・脅迫
  "ぶっ殺", "ブッ殺",
  "ぶっころ", "ブッコロ",
  "死ねよ", "しねよ",
  "殺すぞ", "ころすぞ",
  "殺してやる",
  "爆破", "放火",
  "自殺しろ",

  // 性的表現
  "ちんこ", "チンコ", "ちんぽ", "チンポ",
  "まんこ", "マンコ",
  "おっぱい", "オッパイ",
  "セックス", "せっくす",
  "レイプ", "れいぷ",
  "強姦",
  "痴漢",
  "エロ", "えろ",
  "fuck", "FUCK",
  "shit", "SHIT",
  "dick", "pussy",
  "bitch", "BITCH",

  // 詐欺・スパム
  "儲かる", "もうかる",
  "稼げる", "かせげる",
  "副業", "ふくぎょう",
  "出会い系",
  "LINE交換",
  "ライン交換",
  "DMください",
  "情報商材",
  "投資詐欺",
  "無料配信",

  // 違法行為
  "ノミ行為",
  "八百長",
  "裏情報",
  "インサイダー",
  "不正",
  "違法",
  "脱税",
  "マネロン",
  "マネーロンダリング",

  // 競馬関連の不適切表現
  "イカサマ",
  "いかさま",
  "出来レース",
  "できレース",
  "馬刺し", // 馬関連の不適切表現
  "犬肉",
];

// 正規表現にエスケープ
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// NGワードの正規表現パターンを事前コンパイル
const NG_PATTERNS = NG_WORDS.map(
  (word) => new RegExp(escapeRegex(word), "i")
);

/**
 * テキストにNGワードが含まれているかチェック
 * @returns マッチしたNGワード（なければnull）
 */
export function checkNGWord(text: string): string | null {
  if (!text) return null;

  for (let i = 0; i < NG_WORDS.length; i++) {
    if (NG_PATTERNS[i].test(text)) {
      return NG_WORDS[i];
    }
  }

  return null;
}

/**
 * 複数フィールドをまとめてチェック
 * @returns エラーメッセージ（問題なければnull）
 */
export function checkNGWords(fields: Record<string, string | null | undefined>): string | null {
  for (const [fieldName, value] of Object.entries(fields)) {
    if (!value) continue;
    const matched = checkNGWord(value);
    if (matched) {
      const label = FIELD_LABELS[fieldName] || fieldName;
      return `${label}に不適切な表現が含まれています`;
    }
  }
  return null;
}

const FIELD_LABELS: Record<string, string> = {
  display_name: "表示名",
  bio: "自己紹介",
  body: "コメント",
  comment: "コメント",
  user_handle: "ユーザーID",
};

/**
 * NGワードをマスクして返す（表示用）
 */
export function maskNGWords(text: string): string {
  if (!text) return text;

  let result = text;
  for (let i = 0; i < NG_WORDS.length; i++) {
    result = result.replace(NG_PATTERNS[i], (match) => "＊".repeat(match.length));
  }
  return result;
}
