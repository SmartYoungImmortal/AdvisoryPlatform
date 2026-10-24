/**
 * The two lines under a name, a profession and a location,
 * read out of the one `headline` the API gives an advisor.
 *
 * The seed writes a headline as "role · province" ("ภาษีและบัญชี · กรุงเทพฯ"),
 * and the advisors who wrote their own often do too. The tail is only taken
 * as a place when it is one of Thailand's 77 provinces, so a headline like
 * "ภาษี · บัญชี" stays a single role line instead of claiming somebody lives
 * in a subject. No province, no location line: nothing is invented.
 */

const PROVINCES = new Set([
  "กรุงเทพมหานคร",
  "กรุงเทพฯ",
  "กรุงเทพ",
  "กระบี่",
  "กาญจนบุรี",
  "กาฬสินธุ์",
  "กำแพงเพชร",
  "ขอนแก่น",
  "จันทบุรี",
  "ฉะเชิงเทรา",
  "ชลบุรี",
  "ชัยนาท",
  "ชัยภูมิ",
  "ชุมพร",
  "เชียงราย",
  "เชียงใหม่",
  "ตรัง",
  "ตราด",
  "ตาก",
  "นครนายก",
  "นครปฐม",
  "นครพนม",
  "นครราชสีมา",
  "นครศรีธรรมราช",
  "นครสวรรค์",
  "นนทบุรี",
  "นราธิวาส",
  "น่าน",
  "บึงกาฬ",
  "บุรีรัมย์",
  "ปทุมธานี",
  "ประจวบคีรีขันธ์",
  "ปราจีนบุรี",
  "ปัตตานี",
  "พระนครศรีอยุธยา",
  "อยุธยา",
  "พะเยา",
  "พังงา",
  "พัทลุง",
  "พิจิตร",
  "พิษณุโลก",
  "เพชรบุรี",
  "เพชรบูรณ์",
  "แพร่",
  "ภูเก็ต",
  "มหาสารคาม",
  "มุกดาหาร",
  "แม่ฮ่องสอน",
  "ยโสธร",
  "ยะลา",
  "ร้อยเอ็ด",
  "ระนอง",
  "ระยอง",
  "ราชบุรี",
  "ลพบุรี",
  "ลำปาง",
  "ลำพูน",
  "เลย",
  "ศรีสะเกษ",
  "สกลนคร",
  "สงขลา",
  "สตูล",
  "สมุทรปราการ",
  "สมุทรสงคราม",
  "สมุทรสาคร",
  "สระแก้ว",
  "สระบุรี",
  "สิงห์บุรี",
  "สุโขทัย",
  "สุพรรณบุรี",
  "สุราษฎร์ธานี",
  "สุรินทร์",
  "หนองคาย",
  "หนองบัวลำภู",
  "อ่างทอง",
  "อำนาจเจริญ",
  "อุดรธานี",
  "อุตรดิตถ์",
  "อุทัยธานี",
  "อุบลราชธานี",
]);

/** "role · province" into its two lines; `place` only when the tail is a province. */
export function splitHeadline(headline: string): {
  readonly role: string;
  readonly place: string | null;
} {
  const parts = headline
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  const tail = parts.at(-1);
  if (parts.length > 1 && tail && PROVINCES.has(tail)) {
    return { role: parts.slice(0, -1).join(" · "), place: tail };
  }
  return { role: headline.trim(), place: null };
}

/** Thai vowels written before the consonant they follow in speech. */
const LEADING_VOWELS = /^[เแโใไ]/u;

/**
 * What the avatar shows without a photograph, such as "PB": a Latin
 * name's first and last initials; a Thai name's first consonant, since Thai
 * has no habit of initials and a leading vowel on its own reads as nothing.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  if (/^[A-Za-z]/.test(first)) {
    const last = words.length > 1 ? (words.at(-1) ?? "") : "";
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
  return first.replace(LEADING_VOWELS, "").charAt(0);
}
