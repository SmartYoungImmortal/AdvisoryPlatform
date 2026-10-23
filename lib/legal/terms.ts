import type { LegalDoc, Localised } from "@/lib/legal/types";

/**
 * The terms of service. Written for what Advisory actually does: an advisee
 * books a paid, timed session with an advisor whose identity and credentials
 * were checked, the money is held until the session is done, and both sides
 * can review each other. Every user is bound by all of it; section 9 adds
 * the duties that only advisors carry.
 *
 * Drafted with Thai law in mind (the Civil and Commercial Code, the Unfair
 * Contract Terms Act B.E. 2540, the Consumer Protection Act B.E. 2522, the
 * Electronic Transactions Act B.E. 2544 and the Personal Data Protection Act
 * B.E. 2562). It is not a substitute for review by a Thai-qualified lawyer
 * before the Platform takes real payments.
 */
export const terms: Localised<LegalDoc> = {
  th: {
    title: "ข้อกำหนดการให้บริการ",
    effective: "มีผลตั้งแต่ 24 ตุลาคม 2569",
    version: "ฉบับ 2569.10",
    lead: [
      "ข้อกำหนดการให้บริการนี้ (\"ข้อกำหนด\") เป็นข้อตกลงที่มีผลผูกพันตามกฎหมายระหว่างคุณกับผู้ให้บริการแพลตฟอร์ม Advisory Platform (\"Advisory\" \"เรา\" หรือ \"ของเรา\") ว่าด้วยการเข้าถึงและใช้งานเว็บไซต์ แอปพลิเคชัน และบริการที่เกี่ยวข้องทั้งหมดของเรา (รวมเรียกว่า \"แพลตฟอร์ม\")",
      "โปรดอ่านข้อกำหนดนี้ให้ครบถ้วนก่อนใช้งาน เมื่อคุณสร้างบัญชี เข้าสู่ระบบ จองการปรึกษา หรือเปิดให้บริการบนแพลตฟอร์ม ถือว่าคุณได้อ่าน เข้าใจ และตกลงผูกพันตามข้อกำหนดนี้ นโยบายความเป็นส่วนตัว และนโยบายอื่นที่อ้างถึงในข้อกำหนดนี้ หากคุณไม่ตกลง โปรดหยุดใช้งานแพลตฟอร์ม",
    ],
    sections: [
      {
        id: "acceptance",
        title: "การยอมรับและขอบเขตของข้อกำหนด",
        subsections: [
          {
            title: "ผู้ที่อยู่ภายใต้ข้อกำหนด",
            paragraphs: [
              "ข้อกำหนดนี้ใช้กับผู้ใช้ทุกคน ได้แก่ ผู้เยี่ยมชม ผู้รับคำปรึกษา และผู้ให้คำปรึกษา ข้อ 9 ใช้กับผู้ให้คำปรึกษาเพิ่มเติมจากข้ออื่น หากข้อความในข้อ 9 ขัดหรือแย้งกับข้อกำหนดส่วนอื่น ให้ใช้ข้อ 9 บังคับในเรื่องที่เกี่ยวกับการให้คำปรึกษา",
            ],
          },
          {
            title: "การใช้งานในนามองค์กร",
            paragraphs: [
              "หากคุณใช้แพลตฟอร์มในนามบริษัท ห้างร้าน หรือองค์กรใด คุณรับรองว่ามีอำนาจกระทำการแทนและผูกพันองค์กรนั้นตามข้อกำหนดนี้ และองค์กรนั้นต้องรับผิดร่วมกับคุณต่อการใช้งานดังกล่าว",
            ],
          },
          {
            title: "เอกสารที่เป็นส่วนหนึ่งของข้อกำหนด",
            paragraphs: [
              "นโยบายความเป็นส่วนตัว รายละเอียดบริการที่แสดงในหน้าการจอง อัตราค่าธรรมเนียมที่แสดงบนแพลตฟอร์ม และประกาศหรือแนวปฏิบัติที่เราเผยแพร่เป็นครั้งคราว ถือเป็นส่วนหนึ่งของข้อกำหนดนี้",
            ],
          },
        ],
      },
      {
        id: "definitions",
        title: "คำนิยาม",
        paragraphs: ["ในข้อกำหนดนี้ คำต่อไปนี้มีความหมายดังนี้"],
        bullets: [
          "\"ผู้ใช้\" หมายถึง บุคคลใดก็ตามที่เข้าถึงหรือใช้งานแพลตฟอร์ม ไม่ว่าจะมีบัญชีหรือไม่",
          "\"ผู้รับคำปรึกษา\" หมายถึง ผู้ใช้ที่ค้นหา จอง และชำระค่าบริการการปรึกษา",
          "\"ผู้ให้คำปรึกษา\" หมายถึง ผู้ใช้ที่ผ่านการตรวจสอบตามข้อ 9 และเปิดให้บริการการปรึกษาบนแพลตฟอร์ม",
          "\"บริการ\" หมายถึง หัวข้อการปรึกษาที่ผู้ให้คำปรึกษาเสนอ พร้อมคำอธิบาย ระยะเวลา และราคา",
          "\"การจอง\" หมายถึง การนัดหมายช่วงเวลาเพื่อรับบริการหนึ่งรายการ ซึ่งมีผลเมื่อชำระเงินสำเร็จ",
          "\"การปรึกษา\" หมายถึง การสื่อสารระหว่างผู้รับคำปรึกษากับผู้ให้คำปรึกษาตามการจอง ผ่านแชต การโทร การประชุมทางวิดีโอ หรือช่องทางอื่นที่แพลตฟอร์มจัดให้",
          "\"ค่าบริการ\" หมายถึง จำนวนเงินที่ผู้รับคำปรึกษาชำระสำหรับการจอง",
          "\"ค่าธรรมเนียมแพลตฟอร์ม\" หมายถึง จำนวนเงินที่ Advisory หักจากค่าบริการหรือเรียกเก็บเพิ่มตามอัตราที่แสดงบนแพลตฟอร์ม",
          "\"เนื้อหาของผู้ใช้\" หมายถึง ข้อความ ไฟล์ รูปภาพ รีวิว และข้อมูลใดที่ผู้ใช้ส่งหรือเผยแพร่บนแพลตฟอร์ม",
        ],
      },
      {
        id: "platform",
        title: "บทบาทของแพลตฟอร์ม",
        subsections: [
          {
            title: "แพลตฟอร์มเป็นตัวกลาง",
            paragraphs: [
              "Advisory เป็นผู้ให้บริการพื้นที่ออนไลน์ที่เชื่อมผู้รับคำปรึกษากับผู้ให้คำปรึกษา และให้บริการเสริม เช่น ระบบนัดหมาย ระบบชำระเงิน ระบบแชต และการตรวจสอบเอกสารเบื้องต้น Advisory ไม่ได้เป็นผู้ให้คำปรึกษา ไม่ได้เป็นนายจ้าง ตัวแทน หรือหุ้นส่วนของผู้ให้คำปรึกษา และไม่ได้เป็นคู่สัญญาในสัญญาการให้คำปรึกษา",
            ],
          },
          {
            title: "สัญญาการให้คำปรึกษา",
            paragraphs: [
              "เมื่อการจองมีผล สัญญาการให้คำปรึกษาเกิดขึ้นโดยตรงระหว่างผู้รับคำปรึกษากับผู้ให้คำปรึกษา ผู้ให้คำปรึกษาเป็นผู้รับผิดชอบแต่เพียงผู้เดียวต่อเนื้อหา ความถูกต้อง และคุณภาพของคำปรึกษาที่ให้",
            ],
          },
          {
            title: "ขอบเขตของการตรวจสอบ",
            paragraphs: [
              "เราตรวจสอบตัวตนและเอกสารที่ผู้ให้คำปรึกษาส่งตามขั้นตอนที่เรากำหนด แต่การตรวจสอบนี้ทำได้เท่าที่เอกสารแสดงไว้ ณ เวลาที่ตรวจ เราไม่รับรอง รับประกัน หรือแนะนำผู้ให้คำปรึกษารายใดเป็นการเฉพาะ และไม่รับประกันว่าคุณวุฒิหรือใบอนุญาตยังมีผลอยู่ตลอดเวลา",
            ],
          },
          {
            title: "ลักษณะของคำปรึกษา",
            paragraphs: [
              "คำปรึกษาบนแพลตฟอร์มเป็นความเห็นเพื่อประกอบการตัดสินใจของคุณเอง ไม่ถือเป็นการรับว่าความหรือเป็นทนายความของคุณ การวินิจฉัย รักษา หรือสั่งจ่ายยา การแนะนำการลงทุนเฉพาะตัวที่ต้องได้รับอนุญาต หรือการรับรองผลลัพธ์ใด เว้นแต่ผู้ให้คำปรึกษามีใบอนุญาตที่เกี่ยวข้องและระบุไว้ชัดเจนในบริการ การตัดสินใจและผลที่เกิดจากการตัดสินใจเป็นความรับผิดชอบของคุณ",
            ],
          },
          {
            title: "ไม่ใช่บริการฉุกเฉิน",
            paragraphs: [
              "แพลตฟอร์มไม่เหมาะสำหรับเหตุฉุกเฉิน หากมีอันตรายต่อชีวิต สุขภาพ หรือความปลอดภัย โปรดติดต่อสายด่วนการแพทย์ฉุกเฉิน 1669 เหตุด่วนเหตุร้าย 191 หรือสายด่วนสุขภาพจิต 1323 ทันที",
            ],
          },
        ],
      },
      {
        id: "accounts",
        title: "คุณสมบัติและบัญชีผู้ใช้",
        subsections: [
          {
            title: "คุณสมบัติของผู้ใช้",
            bullets: [
              "คุณต้องมีอายุครบ 20 ปีบริบูรณ์ หรือบรรลุนิติภาวะตามกฎหมาย หากคุณเป็นผู้เยาว์ที่มีอายุตั้งแต่ 15 ปีขึ้นไป ต้องได้รับความยินยอมจากผู้แทนโดยชอบธรรม และผู้แทนนั้นต้องรับผิดชอบต่อการใช้งานของคุณ",
              "คุณต้องมีความสามารถตามกฎหมายในการทำสัญญา และไม่เคยถูกเราระงับหรือปิดบัญชีถาวร",
              "คุณต้องไม่ใช้แพลตฟอร์มขัดต่อกฎหมายที่ใช้บังคับกับคุณ",
            ],
          },
          {
            title: "ข้อมูลที่ถูกต้องและเป็นปัจจุบัน",
            paragraphs: [
              "คุณต้องให้ข้อมูลที่เป็นความจริง ถูกต้อง และครบถ้วนในการสมัคร และปรับปรุงให้เป็นปัจจุบันอยู่เสมอ ชื่อที่แสดงต้องไม่ทำให้ผู้อื่นเข้าใจผิดว่าคุณเป็นบุคคลหรือองค์กรอื่น และต้องไม่มีถ้อยคำหยาบคายหรือละเมิดสิทธิของผู้อื่น",
            ],
          },
          {
            title: "หนึ่งคน หนึ่งบัญชี",
            paragraphs: [
              "บัญชีเป็นของบุคคลผู้สมัครและไม่สามารถโอน ขาย ให้เช่า หรือให้ผู้อื่นใช้ได้ คุณสร้างได้เพียงบัญชีเดียว เว้นแต่ได้รับอนุญาตจากเรา",
            ],
          },
          {
            title: "ความปลอดภัยของบัญชี",
            paragraphs: [
              "คุณมีหน้าที่เก็บรักษารหัสผ่านและข้อมูลการเข้าสู่ระบบเป็นความลับ การกระทำใดที่เกิดขึ้นผ่านบัญชีของคุณถือเป็นการกระทำของคุณ เว้นแต่คุณพิสูจน์ได้ว่าเกิดจากความบกพร่องของระบบของเรา หากสงสัยว่ามีผู้อื่นเข้าถึงบัญชี ให้เปลี่ยนรหัสผ่านและแจ้งเราทันที",
            ],
          },
          {
            title: "การเข้าสู่ระบบผ่านบริการของบุคคลภายนอก",
            paragraphs: [
              "หากคุณเข้าสู่ระบบด้วย Google, Facebook, Apple หรือบริการอื่น การใช้บัญชีดังกล่าวอยู่ภายใต้ข้อกำหนดของผู้ให้บริการนั้น เราได้รับเฉพาะข้อมูลที่คุณอนุญาต และไม่รับผิดชอบต่อการหยุดให้บริการหรือการเปลี่ยนแปลงของผู้ให้บริการภายนอก",
            ],
          },
          {
            title: "การยืนยันตัวตน",
            paragraphs: [
              "เพื่อความปลอดภัยและเพื่อปฏิบัติตามกฎหมาย เราอาจขอให้คุณยืนยันอีเมล หมายเลขโทรศัพท์ หรือตัวตนเพิ่มเติมเมื่อใดก็ได้ หากคุณไม่ดำเนินการ เราอาจจำกัดการใช้งานบางส่วน",
            ],
          },
        ],
      },
      {
        id: "booking",
        title: "การจองการปรึกษา",
        subsections: [
          {
            title: "ขั้นตอนการจอง",
            paragraphs: [
              "คุณเลือกบริการและช่วงเวลาที่ผู้ให้คำปรึกษาเปิดไว้ ระบบจะกันช่วงเวลานั้นไว้ให้ชั่วคราว การจองจะมีผลเมื่อชำระเงินสำเร็จภายในเวลาที่แสดง หากไม่ชำระภายในเวลานั้น ระบบจะยกเลิกการกันเวลาโดยอัตโนมัติ",
            ],
          },
          {
            title: "ข้อมูลที่ให้ตอนจอง",
            paragraphs: [
              "คุณควรอธิบายเรื่องที่ต้องการปรึกษาตามความจริงและเพียงพอให้ผู้ให้คำปรึกษาเตรียมตัวได้ ผู้ให้คำปรึกษาอาจปฏิเสธการจองที่อยู่นอกความเชี่ยวชาญ ขัดต่อกฎหมาย หรือขัดต่อจรรยาบรรณวิชาชีพ ในกรณีนี้คุณจะได้รับเงินคืนเต็มจำนวน",
            ],
          },
          {
            title: "เวลาและเขตเวลา",
            paragraphs: [
              "เวลาในการจองแสดงตามเขตเวลาที่ตั้งไว้ในบัญชีของคุณ คุณมีหน้าที่ตรวจสอบเวลาให้ถูกต้องก่อนยืนยัน",
            ],
          },
        ],
      },
      {
        id: "payment",
        title: "ราคา การชำระเงิน และเงินที่พักไว้",
        subsections: [
          {
            title: "ราคาและภาษี",
            paragraphs: [
              "ผู้ให้คำปรึกษาเป็นผู้กำหนดราคาบริการ ราคาที่แสดงเป็นเงินบาทและรวมค่าธรรมเนียมที่ผู้รับคำปรึกษาต้องชำระแล้ว เว้นแต่ระบุไว้เป็นอย่างอื่น ภาษีที่เกี่ยวข้องจะเรียกเก็บหรือหักตามที่กฎหมายกำหนด",
            ],
          },
          {
            title: "ช่องทางการชำระเงิน",
            paragraphs: [
              "การชำระเงินดำเนินการผ่านผู้ให้บริการรับชำระเงินที่ได้รับอนุญาต ซึ่งอาจมีข้อกำหนดของตนเองเพิ่มเติม เราไม่เก็บหมายเลขบัตรเต็มของคุณ คุณต้องชำระผ่านแพลตฟอร์มเท่านั้น การชำระนอกแพลตฟอร์มจะไม่ได้รับความคุ้มครองตามข้อกำหนดนี้",
            ],
          },
          {
            title: "เงินที่พักไว้",
            paragraphs: [
              "ค่าบริการที่ชำระจะถูกพักไว้และจะโอนให้ผู้ให้คำปรึกษาหลังการปรึกษาเสร็จสิ้น และพ้นระยะเวลาขอคืนเงินตามข้อ 8 หรือเมื่อข้อพิพาทได้รับการพิจารณาแล้ว เงินที่พักไว้ไม่มีดอกเบี้ยให้แก่ฝ่ายใด",
            ],
          },
          {
            title: "การปฏิเสธการชำระเงิน",
            paragraphs: [
              "หากคุณขอยกเลิกรายการกับธนาคารผู้ออกบัตรโดยไม่มีเหตุอันสมควร หลังได้รับการปรึกษาแล้ว เราอาจระงับบัญชีของคุณและเรียกเก็บเงินจำนวนนั้นคืน",
            ],
          },
          {
            title: "ใบเสร็จ",
            paragraphs: [
              "คุณดูประวัติการชำระเงินและดาวน์โหลดใบเสร็จได้ที่หน้าการชำระเงินในบัญชีของคุณ",
            ],
          },
        ],
      },
      {
        id: "sessions",
        title: "การปรึกษา",
        subsections: [
          {
            title: "การเข้าร่วม",
            paragraphs: [
              "ทั้งสองฝ่ายควรเข้าร่วมตรงเวลา หากฝ่ายใดเข้าช้า เวลาการปรึกษาจะไม่ขยายออกไปเกินเวลาสิ้นสุดที่จองไว้ เว้นแต่ทั้งสองฝ่ายตกลงกันในระบบ",
            ],
          },
          {
            title: "การบันทึกการปรึกษา",
            paragraphs: [
              "ห้ามบันทึกเสียง ภาพ หรือวิดีโอของการปรึกษา หรือเผยแพร่เนื้อหาการปรึกษา โดยไม่ได้รับความยินยอมจากอีกฝ่าย ข้อความในแชตของแพลตฟอร์มจะถูกเก็บไว้ตามนโยบายความเป็นส่วนตัว เพื่อใช้ในการตรวจสอบข้อพิพาท",
            ],
          },
          {
            title: "ปัญหาทางเทคนิค",
            paragraphs: [
              "หากการปรึกษาไม่สามารถเกิดขึ้นได้เพราะระบบของเราขัดข้อง คุณจะได้รับเงินคืนเต็มจำนวนหรือเลื่อนนัดได้ หากเกิดจากอุปกรณ์หรืออินเทอร์เน็ตของฝ่ายใด ฝ่ายนั้นเป็นผู้รับผลตามข้อ 8",
            ],
          },
        ],
      },
      {
        id: "cancellation",
        title: "การยกเลิก การเลื่อนนัด และการคืนเงิน",
        subsections: [
          {
            title: "เมื่อผู้รับคำปรึกษายกเลิกหรือเลื่อน",
            bullets: [
              "ยกเลิกหรือเลื่อนก่อนเวลาเริ่มอย่างน้อย 24 ชั่วโมง: คืนเงินเต็มจำนวน หรือเลื่อนได้หนึ่งครั้งโดยไม่มีค่าใช้จ่าย",
              "ยกเลิกภายใน 24 ชั่วโมงก่อนเวลาเริ่ม: คืนเงินร้อยละ 50 ของค่าบริการ",
              "ไม่เข้าร่วมการปรึกษาโดยไม่แจ้งล่วงหน้า หรือเข้าร่วมช้าเกินกึ่งหนึ่งของเวลาที่จอง: ไม่คืนเงิน",
            ],
          },
          {
            title: "เมื่อผู้ให้คำปรึกษายกเลิกหรือไม่มา",
            paragraphs: [
              "คุณจะได้รับเงินคืนเต็มจำนวน หรือเลือกเลื่อนไปช่วงเวลาอื่นโดยไม่มีค่าใช้จ่าย ผู้ให้คำปรึกษาที่ยกเลิกหรือไม่มาบ่อยครั้งอาจถูกลดการแสดงผล ปรับลดระดับ หรือระงับบัญชี",
            ],
          },
          {
            title: "การขอคืนเงินเพราะบริการไม่เป็นไปตามที่ระบุ",
            paragraphs: [
              "หากการปรึกษาไม่ตรงกับคำอธิบายบริการอย่างมีนัยสำคัญ คุณยื่นคำขอคืนเงินพร้อมเหตุผลได้ภายใน 7 วันนับจากเวลาสิ้นสุดการปรึกษา ความไม่พอใจในเนื้อหาคำแนะนำ หรือผลลัพธ์ที่ไม่เป็นไปตามที่หวัง ไม่ถือเป็นเหตุคืนเงินด้วยตัวเอง",
            ],
          },
          {
            title: "การพิจารณาและการคืนเงิน",
            paragraphs: [
              "เราจะพิจารณาจากข้อมูลในระบบ เช่น บันทึกการเข้าร่วมและข้อความในแชต และอาจขอข้อมูลจากทั้งสองฝ่าย เราจะแจ้งผลภายใน 14 วันทำการ เงินคืนจะเข้าช่องทางที่ใช้ชำระ ซึ่งอาจใช้เวลาเพิ่มตามรอบของธนาคารหรือผู้ออกบัตร",
            ],
          },
          {
            title: "สิทธิตามกฎหมาย",
            paragraphs: [
              "นโยบายนี้ไม่ตัดหรือจำกัดสิทธิใดที่คุณมีตามกฎหมายคุ้มครองผู้บริโภค",
            ],
          },
        ],
      },
      {
        id: "advisors",
        title: "ข้อกำหนดเพิ่มเติมสำหรับผู้ให้คำปรึกษา",
        subsections: [
          {
            title: "การสมัครและการตรวจสอบ",
            paragraphs: [
              "ผู้ให้คำปรึกษาต้องยืนยันตัวตนและส่งเอกสารแสดงคุณวุฒิ เช่น ใบอนุญาตประกอบวิชาชีพ วุฒิการศึกษา หรือหนังสือรับรองการทำงาน คุณรับรองว่าเอกสารทั้งหมดเป็นของจริงและเป็นของคุณ เราอาจปฏิเสธ ระงับ หรือเพิกถอนการอนุมัติได้หากเอกสารไม่ครบ ไม่ถูกต้อง หมดอายุ หรือพบภายหลังว่าไม่เป็นความจริง",
            ],
          },
          {
            title: "สถานะผู้ประกอบอาชีพอิสระ",
            paragraphs: [
              "ผู้ให้คำปรึกษาให้บริการในฐานะผู้ประกอบอาชีพอิสระ ไม่ใช่ลูกจ้าง ตัวแทน หรือหุ้นส่วนของ Advisory และไม่มีอำนาจทำการใดในนามของเรา",
            ],
          },
          {
            title: "ใบอนุญาตและกฎหมายวิชาชีพ",
            paragraphs: [
              "หากหัวข้อที่คุณให้คำปรึกษาเป็นกิจกรรมที่กฎหมายกำหนดให้ต้องมีใบอนุญาต เช่น การว่าความหรือให้คำปรึกษากฎหมายในฐานะทนายความ การประกอบวิชาชีพเวชกรรมหรือจิตวิทยาคลินิก การให้คำแนะนำการลงทุน หรือการสอบบัญชี คุณต้องมีใบอนุญาตที่ยังมีผลและปฏิบัติตามกฎหมายและข้อบังคับของสภาวิชาชีพนั้น ห้ามเสนอบริการที่คุณไม่มีสิทธิให้",
            ],
          },
          {
            title: "คุณภาพและความถูกต้องของบริการ",
            paragraphs: [
              "คุณต้องอธิบายบริการ ความเชี่ยวชาญ และประสบการณ์ตามความจริง ไม่รับประกันผลลัพธ์ที่ไม่อาจรับประกันได้ ดูแลตารางเวลาว่างให้ตรงกับที่รับงานได้จริง และให้คำปรึกษาด้วยความระมัดระวังตามมาตรฐานวิชาชีพ",
            ],
          },
          {
            title: "การรักษาความลับและผลประโยชน์ทับซ้อน",
            paragraphs: [
              "คุณต้องรักษาข้อมูลของผู้รับคำปรึกษาเป็นความลับ ใช้เพื่อการปรึกษาเท่านั้น และปฏิบัติตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล หากมีผลประโยชน์ทับซ้อนกับเรื่องที่ปรึกษา ต้องแจ้งผู้รับคำปรึกษาก่อนเริ่มหรือปฏิเสธการจอง",
            ],
          },
          {
            title: "ค่าธรรมเนียมและการรับเงิน",
            paragraphs: [
              "เราหักค่าธรรมเนียมแพลตฟอร์มตามอัตราที่แสดงในหน้ารายได้ก่อนโอนเงินให้คุณ เงินจะถอนได้เมื่อพ้นระยะเวลาขอคืนเงิน และโอนเข้าบัญชีธนาคารในชื่อของคุณที่ยืนยันแล้วเท่านั้น เราอาจระงับการโอนชั่วคราวหากมีข้อพิพาท การขอคืนเงิน หรือข้อสงสัยว่ามีการทุจริต",
            ],
          },
          {
            title: "ภาษี",
            paragraphs: [
              "คุณเป็นผู้รับผิดชอบยื่นแบบและชำระภาษีจากรายได้ของคุณเอง เราอาจหักภาษี ณ ที่จ่ายหรือรายงานข้อมูลรายได้ต่อหน่วยงานรัฐตามที่กฎหมายกำหนด รวมถึงกฎหมายว่าด้วยการรายงานข้อมูลของผู้ให้บริการแพลตฟอร์มดิจิทัล",
            ],
          },
          {
            title: "ประกันความรับผิดทางวิชาชีพ",
            paragraphs: [
              "เราแนะนำให้ผู้ให้คำปรึกษามีประกันความรับผิดทางวิชาชีพที่เหมาะสมกับบริการของตน ค่าเสียหายที่เกิดจากคำปรึกษาของคุณเป็นความรับผิดของคุณ ไม่ใช่ของ Advisory",
            ],
          },
        ],
      },
      {
        id: "conduct",
        title: "การใช้งานที่ไม่อนุญาต",
        subsections: [
          {
            title: "ข้อห้ามทั่วไป",
            paragraphs: ["คุณตกลงจะไม่ใช้แพลตฟอร์มเพื่อหรือในลักษณะต่อไปนี้"],
            bullets: [
              "แอบอ้างเป็นบุคคลหรือองค์กรอื่น หรือแสดงคุณวุฒิ ใบอนุญาต หรือประสบการณ์ที่ไม่มีจริง",
              "ส่งข้อความหรือเนื้อหาที่ข่มขู่ คุกคาม หมิ่นประมาท เลือกปฏิบัติ ลามกอนาจาร หรือยุยงให้เกิดความรุนแรง",
              "ให้หรือขอคำปรึกษาเพื่อกระทำความผิดกฎหมาย หลีกเลี่ยงภาษีโดยมิชอบ ฟอกเงิน หรือฉ้อโกงผู้อื่น",
              "เสนอบริการที่ต้องมีใบอนุญาตโดยไม่มีใบอนุญาต หรือสั่งจ่ายยาและอุปกรณ์การแพทย์",
              "ปลอมแปลงรีวิว สร้างบัญชีหลายบัญชี หรือปั่นคะแนนและการจัดอันดับ",
              "เก็บรวบรวมข้อมูลของผู้ใช้อื่นโดยไม่ได้รับอนุญาต รวมถึงด้วยโปรแกรมอัตโนมัติ",
              "พยายามเข้าถึงระบบโดยไม่ได้รับอนุญาต แพร่โปรแกรมไม่พึงประสงค์ หรือรบกวนการทำงานของแพลตฟอร์ม",
              "ละเมิดทรัพย์สินทางปัญญา ความเป็นส่วนตัว หรือสิทธิอื่นใดของบุคคลอื่น",
              "กระทำการใดที่ขัดต่อกฎหมาย ความสงบเรียบร้อย หรือศีลธรรมอันดีของประชาชน",
            ],
          },
          {
            title: "การติดต่อและชำระเงินนอกแพลตฟอร์ม",
            paragraphs: [
              "ภายใน 12 เดือนนับจากการพบกันครั้งแรกบนแพลตฟอร์ม ห้ามผู้ใช้ชักชวน เสนอ หรือรับการชำระเงินสำหรับการปรึกษานอกแพลตฟอร์ม และห้ามแลกเปลี่ยนช่องทางติดต่อเพื่อวัตถุประสงค์ดังกล่าว การฝ่าฝืนอาจทำให้ถูกระงับบัญชี และเราไม่สามารถคุ้มครองการทำธุรกรรมใดที่เกิดนอกแพลตฟอร์ม",
            ],
          },
        ],
      },
      {
        id: "content",
        title: "เนื้อหาของผู้ใช้และทรัพย์สินทางปัญญา",
        subsections: [
          {
            title: "ความเป็นเจ้าของและสิทธิใช้งาน",
            paragraphs: [
              "คุณยังคงเป็นเจ้าของเนื้อหาของผู้ใช้ที่คุณส่ง โดยคุณอนุญาตให้ Advisory ใช้ เก็บ ทำซ้ำ แสดง และดัดแปลงเท่าที่จำเป็น (เช่น ปรับขนาดรูปภาพ) แบบไม่จำกัดเฉพาะ ไม่มีค่าตอบแทน ทั่วโลก เพื่อให้บริการ ปรับปรุง และประชาสัมพันธ์แพลตฟอร์ม สิทธินี้สิ้นสุดเมื่อคุณลบเนื้อหาหรือปิดบัญชี เว้นแต่ส่วนที่ต้องเก็บตามกฎหมายหรือที่ผู้อื่นได้รับไปแล้ว",
            ],
          },
          {
            title: "คำรับรองเกี่ยวกับเนื้อหา",
            paragraphs: [
              "คุณรับรองว่ามีสิทธิในเนื้อหาที่ส่ง และเนื้อหานั้นไม่ละเมิดกฎหมายหรือสิทธิของผู้อื่น",
            ],
          },
          {
            title: "หลักเกณฑ์ของรีวิว",
            paragraphs: [
              "รีวิวต้องมาจากการปรึกษาที่เกิดขึ้นจริงและสะท้อนประสบการณ์ของคุณอย่างสุจริต ห้ามเสนอหรือรับสิ่งตอบแทนเพื่อแลกกับรีวิว ห้ามข่มขู่ให้แก้หรือลบรีวิว เราอาจซ่อน แก้ไขข้อมูลส่วนบุคคลออก หรือลบรีวิวที่ขัดต่อข้อกำหนดนี้ โดยไม่จำเป็นต้องแจ้งล่วงหน้า",
            ],
          },
          {
            title: "การแจ้งเนื้อหาที่ไม่เหมาะสม",
            paragraphs: [
              "หากพบเนื้อหาที่ละเมิดข้อกำหนดหรือกฎหมาย คุณแจ้งเราได้ผ่านปุ่มรายงานหรืออีเมลด้านล่าง เราจะตรวจสอบและดำเนินการตามความเหมาะสม รวมถึงตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์",
            ],
          },
          {
            title: "ทรัพย์สินทางปัญญาของแพลตฟอร์ม",
            paragraphs: [
              "แพลตฟอร์ม รวมถึงชื่อ เครื่องหมาย โลโก้ การออกแบบ ซอฟต์แวร์ และเนื้อหาที่เราจัดทำ เป็นทรัพย์สินทางปัญญาของ Advisory หรือผู้อนุญาตให้เราใช้ เราอนุญาตให้คุณใช้แพลตฟอร์มเพื่อวัตถุประสงค์ส่วนตัวตามข้อกำหนดนี้เท่านั้น ห้ามคัดลอก ดัดแปลง แยกส่วนโปรแกรม หรือนำไปใช้เชิงพาณิชย์โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร",
              "ข้อเสนอแนะหรือความคิดเห็นที่คุณส่งเกี่ยวกับแพลตฟอร์ม เราอาจนำไปใช้ปรับปรุงได้โดยไม่มีภาระต้องจ่ายค่าตอบแทน",
            ],
          },
        ],
      },
      {
        id: "privacy",
        title: "ข้อมูลส่วนบุคคลและบริการภายนอก",
        subsections: [
          {
            title: "ข้อมูลส่วนบุคคล",
            paragraphs: [
              "เราเก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลตามนโยบายความเป็นส่วนตัว ซึ่งเป็นส่วนหนึ่งของข้อกำหนดนี้ โปรดอ่านนโยบายดังกล่าวเพื่อทราบรายละเอียดและสิทธิของคุณ",
            ],
          },
          {
            title: "บริการและลิงก์ของบุคคลภายนอก",
            paragraphs: [
              "แพลตฟอร์มอาจเชื่อมต่อกับบริการของบุคคลภายนอก เช่น ระบบชำระเงิน การเข้าสู่ระบบ การประชุมทางวิดีโอ หรือลิงก์ไปยังเว็บไซต์อื่น บริการเหล่านี้อยู่ภายใต้ข้อกำหนดและนโยบายของผู้ให้บริการนั้น เราไม่รับผิดชอบต่อเนื้อหา ความพร้อมใช้งาน หรือการกระทำของบุคคลภายนอก",
            ],
          },
        ],
      },
      {
        id: "disclaimer",
        title: "การปฏิเสธการรับประกัน",
        paragraphs: [
          "เราให้บริการแพลตฟอร์ม \"ตามสภาพที่เป็นอยู่\" และ \"ตามที่มีให้บริการ\" เราพยายามให้แพลตฟอร์มทำงานได้อย่างต่อเนื่องและปลอดภัย แต่ไม่รับประกันว่าจะไม่มีการหยุดชะงัก ข้อผิดพลาด หรือการสูญหายของข้อมูล และไม่รับประกันความถูกต้อง ความเหมาะสม หรือผลลัพธ์ของคำปรึกษาใด",
          "เราอาจหยุดให้บริการชั่วคราวเพื่อบำรุงรักษา ปรับปรุง หรือแก้ไขปัญหา โดยจะแจ้งล่วงหน้าเท่าที่ทำได้",
        ],
      },
      {
        id: "liability",
        title: "การจำกัดความรับผิดและการชดใช้ค่าเสียหาย",
        subsections: [
          {
            title: "การจำกัดความรับผิด",
            paragraphs: [
              "เท่าที่กฎหมายอนุญาต Advisory กรรมการ พนักงาน และตัวแทนของเรา ไม่ต้องรับผิดต่อความเสียหายทางอ้อม ความเสียหายพิเศษ การสูญเสียกำไร รายได้ ข้อมูล หรือโอกาสทางธุรกิจ ที่เกิดจากหรือเกี่ยวกับการใช้แพลตฟอร์ม คำปรึกษาของผู้ให้คำปรึกษา หรือการกระทำของผู้ใช้อื่น",
              "ความรับผิดรวมของเราต่อคุณในทุกเรื่อง จำกัดไม่เกินจำนวนที่สูงกว่าระหว่างค่าธรรมเนียมแพลตฟอร์มที่เราได้รับจากธุรกรรมของคุณในช่วง 12 เดือนก่อนเกิดเหตุ หรือ 1,000 บาท",
            ],
          },
          {
            title: "ข้อยกเว้นของการจำกัดความรับผิด",
            paragraphs: [
              "การจำกัดความรับผิดข้างต้นไม่ใช้กับความรับผิดที่เกิดจากการกระทำโดยจงใจหรือประมาทเลินเล่ออย่างร้ายแรงของเรา ความเสียหายต่อชีวิต ร่างกาย หรืออนามัย หรือความรับผิดอื่นที่กฎหมายห้ามจำกัด",
            ],
          },
          {
            title: "การชดใช้ค่าเสียหาย",
            paragraphs: [
              "คุณตกลงชดใช้และปกป้อง Advisory กรรมการ พนักงาน และตัวแทนของเรา จากข้อเรียกร้อง ความเสียหาย ค่าปรับ และค่าใช้จ่ายที่สมเหตุสมผล รวมถึงค่าทนายความ ที่เกิดจากการที่คุณฝ่าฝืนข้อกำหนดนี้หรือกฎหมาย เนื้อหาของผู้ใช้ที่คุณส่ง หรือคำปรึกษาที่คุณให้ในฐานะผู้ให้คำปรึกษา",
            ],
          },
        ],
      },
      {
        id: "termination",
        title: "การระงับและการปิดบัญชี",
        subsections: [
          {
            title: "การดำเนินการของเรา",
            paragraphs: [
              "เราอาจเตือน จำกัดการใช้งาน ระงับชั่วคราว หรือปิดบัญชีของคุณ หากคุณฝ่าฝืนข้อกำหนดนี้ มีความเสี่ยงต่อผู้ใช้อื่นหรือต่อแพลตฟอร์ม หรือเมื่อกฎหมายหรือหน่วยงานรัฐกำหนด เราจะแจ้งเหตุผลให้ทราบเท่าที่ทำได้ และคุณโต้แย้งได้ทางอีเมลด้านล่างภายใน 30 วัน",
            ],
          },
          {
            title: "การปิดบัญชีโดยคุณ",
            paragraphs: [
              "คุณปิดบัญชีได้ที่หน้าการตั้งค่าเมื่อไม่มีการจอง ข้อพิพาท หรือยอดเงินค้างอยู่",
            ],
          },
          {
            title: "ผลของการปิดบัญชี",
            paragraphs: [
              "การจองที่ยังไม่เริ่มจะถูกยกเลิกและคืนเงินตามข้อ 8 ผู้ให้คำปรึกษาจะได้รับเงินที่ถึงกำหนดชำระแล้ว หักด้วยจำนวนที่ต้องคืนหรือชดใช้ ข้อที่โดยสภาพต้องมีผลต่อไป เช่น การจำกัดความรับผิด การชดใช้ค่าเสียหาย และกฎหมายที่ใช้บังคับ ยังคงมีผลหลังการปิดบัญชี",
            ],
          },
        ],
      },
      {
        id: "changes",
        title: "การเปลี่ยนแปลงแพลตฟอร์มและข้อกำหนด",
        paragraphs: [
          "เราอาจเพิ่ม ปรับ หรือยกเลิกฟีเจอร์ของแพลตฟอร์มได้ และอาจแก้ไขข้อกำหนดนี้เป็นครั้งคราว สำหรับการเปลี่ยนแปลงที่มีผลต่อสิทธิหรือหน้าที่ของคุณอย่างมีนัยสำคัญ เราจะแจ้งทางอีเมลหรือการแจ้งเตือนในแพลตฟอร์มล่วงหน้าอย่างน้อย 14 วัน การจองที่ทำไว้ก่อนวันที่ฉบับใหม่มีผลจะเป็นไปตามฉบับเดิม หากคุณใช้งานต่อหลังวันที่มีผล ถือว่าคุณยอมรับฉบับใหม่ หากไม่ยอมรับ คุณปิดบัญชีได้ตามข้อ 15",
        ],
      },
      {
        id: "general",
        title: "ข้อกำหนดทั่วไป",
        subsections: [
          {
            title: "เหตุสุดวิสัย",
            paragraphs: [
              "เราไม่ต้องรับผิดต่อความล่าช้าหรือการไม่สามารถปฏิบัติตามข้อกำหนดที่เกิดจากเหตุที่อยู่นอกเหนือการควบคุมตามสมควร เช่น ภัยธรรมชาติ โรคระบาด เหตุจลาจล การหยุดชะงักของระบบไฟฟ้า อินเทอร์เน็ต หรือผู้ให้บริการภายนอก การโจมตีทางไซเบอร์ หรือคำสั่งของหน่วยงานรัฐ",
            ],
          },
          {
            title: "การสื่อสารทางอิเล็กทรอนิกส์",
            paragraphs: [
              "คุณตกลงให้การแจ้งและการทำธุรกรรมระหว่างคุณกับเราทำผ่านทางอิเล็กทรอนิกส์ได้ และมีผลเช่นเดียวกับหนังสือตามพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ การแจ้งไปยังอีเมลที่ลงทะเบียนไว้ถือว่าคุณได้รับแล้ว",
            ],
          },
          {
            title: "การโอนสิทธิ",
            paragraphs: [
              "คุณโอนสิทธิหรือหน้าที่ตามข้อกำหนดนี้ให้ผู้อื่นไม่ได้ หากไม่ได้รับความยินยอมจากเรา เราอาจโอนสิทธิและหน้าที่ให้บริษัทในเครือหรือผู้รับโอนกิจการ โดยจะแจ้งให้คุณทราบ",
            ],
          },
          {
            title: "ความเป็นโมฆะเฉพาะส่วน",
            paragraphs: [
              "หากข้อใดของข้อกำหนดนี้เป็นโมฆะหรือใช้บังคับไม่ได้ ข้ออื่นยังคงมีผลบังคับ และให้ตีความข้อที่ใช้บังคับไม่ได้นั้นให้ใกล้เคียงกับเจตนาเดิมมากที่สุดเท่าที่กฎหมายอนุญาต",
            ],
          },
          {
            title: "การไม่สละสิทธิ",
            paragraphs: [
              "การที่เราไม่ใช้หรือใช้สิทธิล่าช้า ไม่ถือเป็นการสละสิทธินั้น",
            ],
          },
          {
            title: "ข้อตกลงทั้งหมดและภาษา",
            paragraphs: [
              "ข้อกำหนดนี้และเอกสารที่อ้างถึงเป็นข้อตกลงทั้งหมดระหว่างคุณกับเราในเรื่องนี้ ข้อกำหนดนี้จัดทำเป็นภาษาไทยและภาษาอังกฤษ หากมีความแตกต่างกัน ให้ใช้ฉบับภาษาไทยเป็นหลัก",
            ],
          },
        ],
      },
      {
        id: "law",
        title: "กฎหมายที่ใช้บังคับและการระงับข้อพิพาท",
        paragraphs: [
          "ข้อกำหนดนี้อยู่ภายใต้และตีความตามกฎหมายแห่งราชอาณาจักรไทย",
          "หากเกิดข้อพิพาท ให้แจ้งเราเป็นลายลักษณ์อักษรก่อน และทั้งสองฝ่ายจะพยายามเจรจาโดยสุจริตภายใน 30 วัน หากตกลงกันไม่ได้ ให้ศาลไทยที่มีเขตอำนาจเป็นผู้พิจารณา ทั้งนี้ไม่ตัดสิทธิของคุณในฐานะผู้บริโภคที่จะยื่นเรื่องต่อสำนักงานคณะกรรมการคุ้มครองผู้บริโภค หรือฟ้องคดีต่อศาลที่มีเขตอำนาจตามกฎหมายวิธีพิจารณาคดีผู้บริโภค",
        ],
      },
    ],
    contact: {
      body: "มีคำถามเกี่ยวกับข้อกำหนดนี้ หรือต้องการแจ้งเรื่องร้องเรียน ติดต่อเราได้ที่",
      email: "legal@advisory.co.th",
    },
  },

  en: {
    title: "Terms of Service",
    effective: "In effect from 24 October 2026",
    version: "Version 2026.10",
    lead: [
      "These Terms of Service (the \"Terms\") are a legally binding agreement between you and the operator of Advisory Platform (\"Advisory\", \"we\", \"us\" or \"our\") governing your access to and use of our website, applications and all related services (together, the \"Platform\").",
      "Please read these Terms in full before using the Platform. By creating an account, signing in, booking a session or offering services on the Platform, you confirm that you have read, understood and agree to be bound by these Terms, our Privacy Policy and any other policy referred to in them. If you do not agree, please stop using the Platform.",
    ],
    sections: [
      {
        id: "acceptance",
        title: "Acceptance and scope",
        subsections: [
          {
            title: "Who these Terms apply to",
            paragraphs: [
              "These Terms apply to every user: visitors, advisees and advisors. Section 10 applies to advisors in addition to the rest. Where section 9 conflicts with any other part of these Terms, section 9 governs matters relating to giving advice.",
            ],
          },
          {
            title: "Using the Platform for an organisation",
            paragraphs: [
              "If you use the Platform on behalf of a company, partnership or other organisation, you confirm you are authorised to act for it and bind it to these Terms, and that organisation is jointly responsible with you for that use.",
            ],
          },
          {
            title: "Documents forming part of these Terms",
            paragraphs: [
              "Our Privacy Policy, the service details shown on a booking page, the fee rates shown on the Platform, and notices or guidelines we publish from time to time form part of these Terms.",
            ],
          },
        ],
      },
      {
        id: "definitions",
        title: "Definitions",
        paragraphs: ["In these Terms:"],
        bullets: [
          "\"User\" means anyone who accesses or uses the Platform, with or without an account.",
          "\"Advisee\" means a user who finds, books and pays for consultations.",
          "\"Advisor\" means a user who has passed the checks in section 9 and offers consultations on the Platform.",
          "\"Service\" means a consultation topic an advisor offers, with its description, length and price.",
          "\"Booking\" means a reservation of a time slot for one service, effective once payment succeeds.",
          "\"Session\" means the communication between advisee and advisor under a booking, by chat, call, video meeting or any other channel the Platform provides.",
          "\"Service fee\" means the amount an advisee pays for a booking.",
          "\"Platform fee\" means the amount Advisory deducts from the service fee or charges in addition, at the rate shown on the Platform.",
          "\"User content\" means any text, file, image, review or data a user submits or publishes on the Platform.",
        ],
      },
      {
        id: "platform",
        title: "Our role",
        subsections: [
          {
            title: "We are an intermediary",
            paragraphs: [
              "Advisory provides an online venue connecting advisees with advisors, together with supporting services such as scheduling, payments, chat and initial document checks. Advisory does not give advice, is not the employer, agent or partner of any advisor, and is not a party to the consulting agreement.",
            ],
          },
          {
            title: "The consulting agreement",
            paragraphs: [
              "When a booking takes effect, a consulting agreement is formed directly between the advisee and the advisor. The advisor alone is responsible for the content, accuracy and quality of the advice given.",
            ],
          },
          {
            title: "The limits of our checks",
            paragraphs: [
              "We verify advisors' identity and the documents they submit under our own procedures, but only as far as those documents show at the time of checking. We do not certify, guarantee or recommend any particular advisor, and do not guarantee that a qualification or licence remains valid at all times.",
            ],
          },
          {
            title: "What advice here is",
            paragraphs: [
              "Advice on the Platform is an opinion to inform your own decisions. It is not legal representation, a medical diagnosis, treatment or prescription, licensed personalised investment advice, or a guarantee of any outcome, unless the advisor holds the relevant licence and the service clearly says so. Your decisions, and what follows from them, are your responsibility.",
            ],
          },
          {
            title: "Not an emergency service",
            paragraphs: [
              "The Platform is not for emergencies. If anyone's life, health or safety is at risk, call emergency medical services on 1669, police on 191 or the mental health hotline on 1323 immediately.",
            ],
          },
        ],
      },
      {
        id: "accounts",
        title: "Eligibility and your account",
        subsections: [
          {
            title: "Who can use the Platform",
            bullets: [
              "You must be at least 20 years old or have reached majority under the law. If you are a minor aged 15 or over, you need your legal representative's consent, and that representative is responsible for your use.",
              "You must have the legal capacity to contract and must not have been suspended or permanently removed from the Platform by us.",
              "You must not use the Platform in breach of any law that applies to you.",
            ],
          },
          {
            title: "Accurate, current information",
            paragraphs: [
              "The information you register with must be true, accurate and complete, and kept up to date. Your display name must not lead others to believe you are another person or organisation, and must not be offensive or infringe anyone's rights.",
            ],
          },
          {
            title: "One person, one account",
            paragraphs: [
              "Your account is personal and may not be transferred, sold, rented or used by anyone else. You may hold one account only unless we agree otherwise.",
            ],
          },
          {
            title: "Account security",
            paragraphs: [
              "You must keep your password and sign-in details confidential. Anything done through your account is treated as done by you, unless you show it resulted from a fault in our systems. If you suspect someone else has accessed your account, change your password and tell us at once.",
            ],
          },
          {
            title: "Signing in with third-party services",
            paragraphs: [
              "If you sign in with Google, Facebook, Apple or another service, that account is governed by its provider's terms. We receive only the data you allow, and are not responsible for a third-party provider's outages or changes.",
            ],
          },
          {
            title: "Verification",
            paragraphs: [
              "For security and legal compliance, we may ask you to verify your email, phone number or identity at any time. If you do not, we may restrict parts of the Platform.",
            ],
          },
        ],
      },
      {
        id: "booking",
        title: "Booking a session",
        subsections: [
          {
            title: "How booking works",
            paragraphs: [
              "You choose a service and a time the advisor has opened, and the slot is held for you briefly. The booking takes effect once payment succeeds within the time shown. If payment is not completed in time, the hold is released automatically.",
            ],
          },
          {
            title: "What you tell the advisor",
            paragraphs: [
              "Describe what you want to discuss truthfully and in enough detail for the advisor to prepare. An advisor may decline a booking that is outside their expertise, unlawful or against their professional code; you then receive a full refund.",
            ],
          },
          {
            title: "Times and time zones",
            paragraphs: [
              "Booking times are shown in the time zone set on your account. You are responsible for checking the time before confirming.",
            ],
          },
        ],
      },
      {
        id: "payment",
        title: "Prices, payment and held funds",
        subsections: [
          {
            title: "Prices and tax",
            paragraphs: [
              "Advisors set the price of their services. Prices are in Thai baht and include the fees an advisee pays unless stated otherwise. Applicable taxes are charged or withheld as the law requires.",
            ],
          },
          {
            title: "Payment methods",
            paragraphs: [
              "Payments are processed by licensed payment service providers, which may have terms of their own. We do not store your full card number. You must pay through the Platform only; payments made outside it are not protected by these Terms.",
            ],
          },
          {
            title: "Held funds",
            paragraphs: [
              "The service fee is held and released to the advisor only after the session is complete and the refund window in section 8 has passed, or a dispute has been decided. No interest accrues to anyone on held funds.",
            ],
          },
          {
            title: "Chargebacks",
            paragraphs: [
              "If you reverse a card payment with your bank without good reason after receiving the session, we may suspend your account and recover the amount.",
            ],
          },
          {
            title: "Receipts",
            paragraphs: [
              "You can see your payment history and download receipts from the payments page of your account.",
            ],
          },
        ],
      },
      {
        id: "sessions",
        title: "Sessions",
        subsections: [
          {
            title: "Attending",
            paragraphs: [
              "Both parties should attend on time. If either joins late, the session does not run beyond the booked end time unless both agree in the Platform.",
            ],
          },
          {
            title: "Recording",
            paragraphs: [
              "Do not record audio, images or video of a session, or publish what was discussed, without the other party's consent. Chat messages on the Platform are retained under our Privacy Policy for resolving disputes.",
            ],
          },
          {
            title: "Technical problems",
            paragraphs: [
              "If a session cannot take place because our systems fail, you receive a full refund or may reschedule. If it fails because of a party's own device or connection, that party bears the consequence under section 8.",
            ],
          },
        ],
      },
      {
        id: "cancellation",
        title: "Cancelling, rescheduling and refunds",
        subsections: [
          {
            title: "If you cancel or reschedule as an advisee",
            bullets: [
              "At least 24 hours before the start: full refund, or one free reschedule.",
              "Within 24 hours of the start: 50% of the service fee refunded.",
              "Not attending without notice, or joining after half the booked time has passed: no refund.",
            ],
          },
          {
            title: "If the advisor cancels or does not attend",
            paragraphs: [
              "You receive a full refund, or may move to another time at no cost. Advisors who cancel or miss sessions repeatedly may be shown less, lowered in level or suspended.",
            ],
          },
          {
            title: "Refunds when a session is not as described",
            paragraphs: [
              "If a session differs materially from the service description, you may request a refund with reasons within 7 days of its end. Disagreeing with the advice, or an outcome other than you hoped, is not on its own a ground for a refund.",
            ],
          },
          {
            title: "How we decide",
            paragraphs: [
              "We decide on the records in the system, such as attendance and chat messages, and may ask both parties for information. We will reply within 14 business days. Refunds go to the original payment method and may take longer to arrive depending on your bank or card issuer.",
            ],
          },
          {
            title: "Your statutory rights",
            paragraphs: [
              "Nothing in this policy excludes or limits any right you have under consumer protection law.",
            ],
          },
        ],
      },
      {
        id: "advisors",
        title: "Additional terms for advisors",
        subsections: [
          {
            title: "Applying and verification",
            paragraphs: [
              "Advisors must verify their identity and submit evidence of their qualifications, such as a professional licence, degree or employment certificate. You confirm every document is genuine and your own. We may refuse, suspend or withdraw approval if documents are missing, incorrect, expired or later found to be untrue.",
            ],
          },
          {
            title: "Independent status",
            paragraphs: [
              "Advisors provide services as independent professionals, not as employees, agents or partners of Advisory, and have no authority to act on our behalf.",
            ],
          },
          {
            title: "Licences and professional law",
            paragraphs: [
              "If a topic you advise on is a regulated activity requiring a licence, such as acting as a lawyer, practising medicine or clinical psychology, giving investment advice or auditing accounts, you must hold a valid licence and follow the law and the rules of the relevant professional body. Do not offer services you are not entitled to give.",
            ],
          },
          {
            title: "Quality and accuracy",
            paragraphs: [
              "Describe your services, expertise and experience truthfully, promise no results that cannot be promised, keep your availability to times you can actually take, and advise with the care your profession expects.",
            ],
          },
          {
            title: "Confidentiality and conflicts of interest",
            paragraphs: [
              "Keep advisees' information confidential, use it only for the session, and comply with personal data protection law. If you have a conflict of interest in a matter, tell the advisee before starting or decline the booking.",
            ],
          },
          {
            title: "Fees and payouts",
            paragraphs: [
              "We deduct the platform fee at the rate shown on your earnings page before paying you. Earnings can be withdrawn once the refund window has passed, and only to a verified bank account in your own name. We may hold a payout temporarily during a dispute, a refund request or a suspected fraud.",
            ],
          },
          {
            title: "Tax",
            paragraphs: [
              "You are responsible for filing and paying tax on your own income. We may withhold tax or report income data to authorities as the law requires, including under laws on reporting by digital platform operators.",
            ],
          },
          {
            title: "Professional liability insurance",
            paragraphs: [
              "We recommend that advisors hold professional liability insurance suited to their services. Loss arising from your advice is your liability, not Advisory's.",
            ],
          },
        ],
      },
      {
        id: "conduct",
        title: "What is not allowed",
        subsections: [
          {
            title: "General prohibitions",
            paragraphs: ["You agree not to use the Platform to, or in a way that would:"],
            bullets: [
              "impersonate any person or organisation, or claim qualifications, licences or experience you do not have;",
              "send threatening, harassing, defamatory, discriminatory or obscene content, or incite violence;",
              "give or seek advice to break the law, evade tax unlawfully, launder money or defraud others;",
              "offer licensed services without a licence, or prescribe medicines or medical devices;",
              "fake reviews, run multiple accounts, or manipulate ratings and rankings;",
              "collect other users' data without permission, including by automated means;",
              "attempt unauthorised access, spread malware or interfere with the Platform's operation;",
              "infringe anyone's intellectual property, privacy or other rights;",
              "do anything contrary to law, public order or good morals.",
            ],
          },
          {
            title: "Contact and payment outside the Platform",
            paragraphs: [
              "For 12 months after first meeting on the Platform, users must not solicit, offer or accept payment for consultations outside the Platform, nor exchange contact details for that purpose. Doing so may lead to suspension, and we cannot protect any transaction made off the Platform.",
            ],
          },
        ],
      },
      {
        id: "content",
        title: "User content and intellectual property",
        subsections: [
          {
            title: "Ownership and licence",
            paragraphs: [
              "You keep ownership of the user content you submit. You grant Advisory a non-exclusive, royalty-free, worldwide licence to use, store, reproduce, display and adapt it as far as needed (for example, resizing an image) to provide, improve and promote the Platform. The licence ends when you delete the content or close your account, except for what must be kept by law or has already been shared with others.",
            ],
          },
          {
            title: "Your promises about content",
            paragraphs: [
              "You confirm you have the rights to what you submit, and that it does not break the law or infringe anyone's rights.",
            ],
          },
          {
            title: "Review rules",
            paragraphs: [
              "Reviews must come from a session that took place and honestly reflect your experience. Offering or accepting anything in exchange for a review, or pressuring someone to change or remove one, is not allowed. We may hide, redact personal data from, or remove reviews that break these Terms without prior notice.",
            ],
          },
          {
            title: "Reporting content",
            paragraphs: [
              "If you see content that breaks these Terms or the law, report it with the report button or the email below. We will review it and act as appropriate, including under the Computer-related Crime Act.",
            ],
          },
          {
            title: "The Platform's intellectual property",
            paragraphs: [
              "The Platform, including its name, marks, logo, design, software and the content we produce, is the intellectual property of Advisory or its licensors. We permit you to use the Platform for your own purposes under these Terms only. Do not copy, adapt, reverse engineer or use it commercially without written permission.",
              "We may use any feedback or suggestions you send about the Platform to improve it, without obligation to pay you.",
            ],
          },
        ],
      },
      {
        id: "privacy",
        title: "Personal data and third-party services",
        subsections: [
          {
            title: "Personal data",
            paragraphs: [
              "We collect, use and disclose personal data under our Privacy Policy, which forms part of these Terms. Please read it for the details and your rights.",
            ],
          },
          {
            title: "Third-party services and links",
            paragraphs: [
              "The Platform may connect to third-party services such as payments, sign-in or video meetings, or link to other websites. These are governed by their providers' own terms and policies. We are not responsible for third parties' content, availability or conduct.",
            ],
          },
        ],
      },
      {
        id: "disclaimer",
        title: "Disclaimer of warranties",
        paragraphs: [
          "We provide the Platform \"as is\" and \"as available\". We work to keep it running and secure, but do not warrant that it will be free of interruption, errors or data loss, nor the accuracy, suitability or outcome of any advice.",
          "We may suspend the Platform temporarily for maintenance, improvements or fixes, with advance notice where practicable.",
        ],
      },
      {
        id: "liability",
        title: "Limitation of liability and indemnity",
        subsections: [
          {
            title: "Limitation of liability",
            paragraphs: [
              "To the extent the law allows, Advisory and its directors, employees and agents are not liable for indirect or special damages, or for loss of profit, revenue, data or business opportunity, arising from or relating to use of the Platform, an advisor's advice or another user's conduct.",
              "Our total liability to you for all matters is limited to the greater of the platform fees we received from your transactions in the 12 months before the event, or 1,000 baht.",
            ],
          },
          {
            title: "Exceptions to the limits",
            paragraphs: [
              "These limits do not apply to liability for our wilful misconduct or gross negligence, for harm to life, body or health, or to any other liability the law does not allow to be limited.",
            ],
          },
          {
            title: "Indemnity",
            paragraphs: [
              "You agree to indemnify and hold harmless Advisory and its directors, employees and agents from claims, losses, fines and reasonable costs, including legal fees, arising from your breach of these Terms or the law, from user content you submit, or from advice you give as an advisor.",
            ],
          },
        ],
      },
      {
        id: "termination",
        title: "Suspension and closing an account",
        subsections: [
          {
            title: "What we may do",
            paragraphs: [
              "We may warn you, restrict features, suspend or close your account if you breach these Terms, pose a risk to other users or the Platform, or where the law or an authority requires it. We will tell you why where we can, and you may appeal by email within 30 days.",
            ],
          },
          {
            title: "Closing your own account",
            paragraphs: [
              "You can close your account from Settings once no bookings, disputes or balances are outstanding.",
            ],
          },
          {
            title: "What happens on closure",
            paragraphs: [
              "Bookings that have not started are cancelled and refunded under section 8. Advisors receive earnings already due, less any amount to be refunded or indemnified. Terms that by their nature should survive, such as the limitation of liability, indemnity and governing law, continue after closure.",
            ],
          },
        ],
      },
      {
        id: "changes",
        title: "Changes to the Platform and these Terms",
        paragraphs: [
          "We may add, change or remove features, and may amend these Terms from time to time. For changes that significantly affect your rights or obligations, we will give at least 14 days' notice by email or in-app notification. Bookings made before the new version takes effect follow the old one. Continuing to use the Platform after the effective date means you accept the new version; if you do not, you may close your account under section 15.",
        ],
      },
      {
        id: "general",
        title: "General",
        subsections: [
          {
            title: "Force majeure",
            paragraphs: [
              "We are not liable for delay or failure to perform caused by events beyond our reasonable control, such as natural disasters, epidemics, civil unrest, outages of power, internet or third-party providers, cyberattacks or orders of authorities.",
            ],
          },
          {
            title: "Electronic communications",
            paragraphs: [
              "You agree that notices and transactions between you and us may be made electronically and have the same effect as writing under the Electronic Transactions Act. A notice sent to your registered email is treated as received.",
            ],
          },
          {
            title: "Assignment",
            paragraphs: [
              "You may not transfer your rights or obligations under these Terms without our consent. We may transfer ours to an affiliate or a successor to the business, and will tell you if we do.",
            ],
          },
          {
            title: "Severability",
            paragraphs: [
              "If any part of these Terms is void or unenforceable, the rest remains in force, and that part is read as close to its original intent as the law allows.",
            ],
          },
          {
            title: "No waiver",
            paragraphs: [
              "Our not exercising, or delaying in exercising, a right does not waive it.",
            ],
          },
          {
            title: "Entire agreement and language",
            paragraphs: [
              "These Terms and the documents they refer to are the entire agreement between you and us on this subject. They are made in Thai and English; if the two differ, the Thai version prevails.",
            ],
          },
        ],
      },
      {
        id: "law",
        title: "Governing law and disputes",
        paragraphs: [
          "These Terms are governed by and construed under the laws of the Kingdom of Thailand.",
          "In a dispute, first notify us in writing; both parties will try in good faith to resolve it within 30 days. Failing that, it goes to the Thai courts with jurisdiction. This does not affect your right as a consumer to complain to the Office of the Consumer Protection Board, or to bring a case in a competent court under the Consumer Case Procedure Act.",
        ],
      },
    ],
    contact: {
      body: "Questions about these Terms, or a complaint to raise? Write to us at",
      email: "legal@advisory.co.th",
    },
  },
};
