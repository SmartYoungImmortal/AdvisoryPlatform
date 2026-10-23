import type { LegalDoc, Localised } from "@/lib/legal/types";

/**
 * The privacy notice, laid out the way the Personal Data Protection Act
 * B.E. 2562 (2019) asks one to be (sections 23 and 30 to 42): who the
 * controller is, what is collected and from where, why and on which legal
 * basis, who receives it, transfers abroad, retention, security, the data
 * subject's rights and how to use them. Written for what the Platform holds:
 * accounts, bookings and payments, chats, and advisors' identity and
 * credential documents.
 *
 * Not a substitute for review by a Thai-qualified lawyer or DPO before the
 * Platform processes real customers' data.
 */
export const privacy: Localised<LegalDoc> = {
  th: {
    title: "นโยบายความเป็นส่วนตัว",
    effective: "มีผลตั้งแต่ 24 ตุลาคม 2569",
    version: "ฉบับ 2569.10",
    lead: [
      "Advisory Platform (\"เรา\") ให้ความสำคัญกับความเป็นส่วนตัวของคุณ นโยบายนี้อธิบายว่าเราเก็บรวบรวม ใช้ เปิดเผย และคุ้มครองข้อมูลส่วนบุคคลของคุณอย่างไร เมื่อคุณใช้เว็บไซต์ แอปพลิเคชัน และบริการของเรา (\"แพลตฟอร์ม\") ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 และกฎหมายที่เกี่ยวข้อง (\"กฎหมายคุ้มครองข้อมูล\")",
      "โปรดอ่านนโยบายนี้ร่วมกับข้อกำหนดการให้บริการ หากคุณไม่ประสงค์ให้เราประมวลผลข้อมูลตามที่อธิบายไว้ คุณอาจใช้บริการบางส่วนไม่ได้",
    ],
    sections: [
      {
        id: "controller",
        title: "ผู้ควบคุมข้อมูลส่วนบุคคล",
        paragraphs: [
          "Advisory Platform เป็นผู้ควบคุมข้อมูลส่วนบุคคลสำหรับข้อมูลที่เก็บผ่านแพลตฟอร์ม และได้แต่งตั้งเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) เพื่อดูแลการปฏิบัติตามนโยบายนี้ ติดต่อได้ที่อีเมลท้ายนโยบาย",
          "ในการปรึกษา ผู้ให้คำปรึกษาแต่ละคนอาจเป็นผู้ควบคุมข้อมูลแยกต่างหากสำหรับข้อมูลที่คุณให้ระหว่างการปรึกษา และต้องคุ้มครองข้อมูลนั้นตามกฎหมายและข้อกำหนดการให้บริการ",
        ],
      },
      {
        id: "scope",
        title: "ขอบเขตของนโยบาย",
        paragraphs: [
          "นโยบายนี้ใช้กับผู้เยี่ยมชม ผู้รับคำปรึกษา ผู้ให้คำปรึกษา และผู้ที่ติดต่อเรา ไม่ครอบคลุมเว็บไซต์ แอป หรือบริการของบุคคลภายนอกที่เชื่อมต่อจากแพลตฟอร์ม ซึ่งมีนโยบายของตนเอง",
        ],
      },
      {
        id: "collect",
        title: "ข้อมูลส่วนบุคคลที่เราเก็บ",
        subsections: [
          {
            title: "ข้อมูลที่คุณให้เราโดยตรง",
            bullets: [
              "ข้อมูลระบุตัวตนและการติดต่อ: ชื่อที่แสดง ชื่อจริง อีเมล หมายเลขโทรศัพท์ (ถ้ามี) และรูปโปรไฟล์",
              "ข้อมูลบัญชี: รหัสผ่าน (เก็บในรูปแบบแฮชที่ย้อนกลับไม่ได้) เขตเวลา และภาษาที่เลือก",
              "ข้อมูลการจอง: บริการ ช่วงเวลา และรายละเอียดเรื่องที่ต้องการปรึกษาที่คุณกรอก",
              "ข้อมูลการสื่อสาร: ข้อความ ไฟล์ และรูปภาพที่ส่งในแชต รวมถึงการติดต่อฝ่ายช่วยเหลือ",
              "ข้อมูลความคิดเห็น: รีวิว คะแนน และรายงานเนื้อหาที่ไม่เหมาะสม",
              "สำหรับผู้ให้คำปรึกษาเพิ่มเติม: สำเนาเอกสารยืนยันตัวตน ใบอนุญาตประกอบวิชาชีพ วุฒิการศึกษา ประวัติการทำงาน และข้อมูลบัญชีธนาคารสำหรับรับเงิน",
            ],
          },
          {
            title: "ข้อมูลที่เก็บโดยอัตโนมัติเมื่อคุณใช้งาน",
            bullets: [
              "ข้อมูลอุปกรณ์และการเชื่อมต่อ: หมายเลข IP ประเภทอุปกรณ์ ระบบปฏิบัติการ เบราว์เซอร์ และตัวระบุอุปกรณ์",
              "ข้อมูลการใช้งาน: หน้าที่เปิด คำค้นหา เวลาและระยะเวลาการใช้งาน และบันทึกการทำงานของระบบ",
              "ข้อมูลจากคุกกี้และเทคโนโลยีที่คล้ายกัน ตามข้อ 12",
            ],
          },
          {
            title: "ข้อมูลที่ได้จากบุคคลภายนอก",
            bullets: [
              "ผู้ให้บริการเข้าสู่ระบบ (Google, Facebook, Apple): ชื่อ อีเมล และรูปโปรไฟล์ตามที่คุณอนุญาต",
              "ผู้ให้บริการรับชำระเงิน: ผลการชำระเงิน เลขอ้างอิงธุรกรรม และเลขบัตรสี่หลักท้าย (เราไม่ได้รับเลขบัตรเต็มหรือรหัส CVV)",
              "ผู้ใช้อื่น: เช่น เมื่อผู้ให้คำปรึกษาตอบรีวิวของคุณ หรือมีผู้รายงานบัญชีของคุณ",
            ],
          },
        ],
      },
      {
        id: "purpose",
        title: "วัตถุประสงค์และฐานทางกฎหมาย",
        paragraphs: ["เราประมวลผลข้อมูลส่วนบุคคลเท่าที่จำเป็น เพื่อวัตถุประสงค์และตามฐานทางกฎหมายต่อไปนี้"],
        subsections: [
          {
            title: "เพื่อปฏิบัติตามสัญญา (มาตรา 24(3))",
            bullets: [
              "สร้างและดูแลบัญชี ยืนยันการเข้าสู่ระบบ",
              "แสดงโปรไฟล์ผู้ให้คำปรึกษา จัดการการจอง การเลื่อน และการยกเลิก",
              "รับชำระเงิน พักเงิน คืนเงิน และโอนรายได้ให้ผู้ให้คำปรึกษา",
              "เปิดช่องทางแชตและการแจ้งเตือนเกี่ยวกับการจอง",
              "ให้บริการฝ่ายช่วยเหลือและพิจารณาข้อพิพาท",
            ],
          },
          {
            title: "เพื่อปฏิบัติตามกฎหมาย (มาตรา 24(6))",
            bullets: [
              "จัดทำและเก็บรักษาเอกสารทางบัญชีและภาษี",
              "รายงานข้อมูลต่อหน่วยงานรัฐตามกฎหมาย เช่น กรมสรรพากร",
              "ปฏิบัติตามคำสั่งศาล หมายเรียก หรือคำขอของหน่วยงานที่มีอำนาจ",
              "เก็บข้อมูลจราจรทางคอมพิวเตอร์ตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์",
            ],
          },
          {
            title: "เพื่อประโยชน์โดยชอบด้วยกฎหมาย (มาตรา 24(5))",
            bullets: [
              "ตรวจสอบเอกสารและคุณวุฒิของผู้ให้คำปรึกษา เพื่อความปลอดภัยของผู้รับคำปรึกษา",
              "ป้องกัน ตรวจจับ และสอบสวนการฉ้อโกง รีวิวปลอม สแปม และการใช้งานที่ฝ่าฝืนข้อกำหนด",
              "รักษาความปลอดภัยของระบบและบัญชี",
              "วิเคราะห์การใช้งานในภาพรวมเพื่อปรับปรุงแพลตฟอร์ม และแนะนำผู้ให้คำปรึกษาที่เกี่ยวข้อง",
              "ก่อตั้ง ใช้ หรือยกขึ้นต่อสู้สิทธิเรียกร้องทางกฎหมาย",
            ],
          },
          {
            title: "ตามความยินยอมของคุณ (มาตรา 19 และ 26)",
            bullets: [
              "ประมวลผลข้อมูลอ่อนไหวตามข้อ 5",
              "ส่งข่าวสาร โปรโมชั่น และแบบสอบถาม ตามข้อ 13",
              "ใช้คุกกี้ที่ไม่จำเป็นต่อการทำงาน ตามข้อ 12",
            ],
          },
        ],
      },
      {
        id: "sensitive",
        title: "ข้อมูลส่วนบุคคลที่มีความอ่อนไหว",
        paragraphs: [
          "เอกสารยืนยันตัวตนที่ผู้ให้คำปรึกษาส่ง เช่น บัตรประจำตัวประชาชน อาจมีข้อมูลอ่อนไหว เช่น ศาสนาหรือหมู่โลหิต เราจะขอความยินยอมโดยชัดแจ้งก่อนเก็บ ใช้เพื่อยืนยันตัวตนเท่านั้น จำกัดการเข้าถึงเฉพาะเจ้าหน้าที่ตรวจสอบ และแนะนำให้ปิดบังข้อมูลที่ไม่จำเป็นก่อนส่ง",
          "หากคุณเล่าเรื่องสุขภาพ ความเชื่อ หรือเรื่องส่วนตัวอื่นในการจองหรือการปรึกษา ถือว่าคุณให้ความยินยอมโดยชัดแจ้งให้ข้อมูลนั้นถูกส่งถึงผู้ให้คำปรึกษาในการจองนั้น เพื่อรับคำปรึกษา ข้อมูลนี้จะไม่ถูกใช้เพื่อการตลาดหรือการแนะนำ และทีมงานจะเข้าถึงเฉพาะเมื่อต้องพิจารณาข้อร้องเรียนหรือเมื่อกฎหมายกำหนด",
          "เราไม่เก็บข้อมูลชีวภาพ (เช่น ใบหน้าหรือลายนิ้วมือเพื่อการยืนยันตัวตน) หรือประวัติอาชญากรรม เว้นแต่จะแจ้งและขอความยินยอมแยกต่างหากในอนาคต",
        ],
      },
      {
        id: "automated",
        title: "การประมวลผลอัตโนมัติ",
        paragraphs: [
          "เราใช้ระบบอัตโนมัติจัดลำดับและแนะนำผู้ให้คำปรึกษาจากหมวดหมู่ คำค้นหา และคะแนนรีวิว และใช้ระบบตรวจจับความผิดปกติเพื่อป้องกันการฉ้อโกง เราไม่ตัดสินใจเรื่องที่มีผลกระทบต่อคุณอย่างมีนัยสำคัญด้วยระบบอัตโนมัติเพียงอย่างเดียว การระงับบัญชีหรือการปฏิเสธการคืนเงินจะผ่านการพิจารณาของเจ้าหน้าที่เสมอ",
        ],
      },
      {
        id: "share",
        title: "การเปิดเผยข้อมูลส่วนบุคคล",
        paragraphs: [
          "เราไม่ขาย ให้เช่า หรือแลกเปลี่ยนข้อมูลส่วนบุคคลของคุณเพื่อการโฆษณาของบุคคลอื่น เราเปิดเผยเท่าที่จำเป็นให้กับผู้รับต่อไปนี้",
        ],
        bullets: [
          "ผู้ให้คำปรึกษาที่คุณจอง: ชื่อที่แสดง รูปโปรไฟล์ รายละเอียดการจอง และข้อความในแชต ผู้ให้คำปรึกษาไม่เห็นอีเมล หมายเลขโทรศัพท์ หรือข้อมูลการชำระเงินของคุณ",
          "ผู้รับคำปรึกษา: ข้อมูลโปรไฟล์สาธารณะของผู้ให้คำปรึกษา เช่น ชื่อ รูป คุณวุฒิที่ผ่านการตรวจสอบ บริการ และรีวิว",
          "ผู้ให้บริการรับชำระเงินและธนาคาร เพื่อรับชำระ คืนเงิน และโอนรายได้",
          "ผู้ประมวลผลข้อมูลที่ทำงานแทนเรา เช่น ผู้ให้บริการคลาวด์ ฐานข้อมูล การจัดเก็บไฟล์ อีเมล และการวิเคราะห์ ภายใต้สัญญาที่กำหนดให้ใช้ข้อมูลตามคำสั่งของเราและรักษาความลับ",
          "ที่ปรึกษาวิชาชีพของเรา เช่น ทนายความและผู้สอบบัญชี ภายใต้หน้าที่รักษาความลับ",
          "หน่วยงานรัฐ ศาล หรือเจ้าหน้าที่ผู้มีอำนาจ เมื่อกฎหมายกำหนดหรือเพื่อคุ้มครองชีวิตและความปลอดภัย",
          "ผู้รับโอนกิจการ หากมีการควบรวมหรือโอนกิจการ ซึ่งต้องคุ้มครองข้อมูลตามนโยบายนี้ต่อไป",
        ],
      },
      {
        id: "transfer",
        title: "การส่งหรือโอนข้อมูลไปต่างประเทศ",
        paragraphs: [
          "ผู้ประมวลผลข้อมูลบางรายของเรามีเซิร์ฟเวอร์อยู่นอกประเทศไทย ในการส่งข้อมูลไปต่างประเทศ เราจะดำเนินการตามมาตรา 28 และ 29 ของพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล เช่น ส่งไปยังประเทศที่มีมาตรฐานการคุ้มครองเพียงพอ ใช้ข้อสัญญามาตรฐานหรือมาตรการคุ้มครองที่เหมาะสม หรือในกรณีที่จำเป็นเพื่อปฏิบัติตามสัญญากับคุณ",
        ],
      },
      {
        id: "retention",
        title: "ระยะเวลาการเก็บรักษา",
        paragraphs: [
          "เราเก็บข้อมูลเท่าที่จำเป็นตามวัตถุประสงค์ เมื่อพ้นระยะเวลาแล้วจะลบ ทำลาย หรือทำให้เป็นข้อมูลที่ระบุตัวบุคคลไม่ได้",
        ],
        bullets: [
          "ข้อมูลบัญชีและโปรไฟล์: ตลอดเวลาที่บัญชียังเปิดอยู่ และไม่เกิน 90 วันหลังปิดบัญชี",
          "ข้อมูลการจอง การชำระเงิน และใบเสร็จ: 10 ปีนับจากวันทำธุรกรรม ตามกฎหมายการบัญชีและประมวลรัษฎากร",
          "ข้อความในแชตและไฟล์ในการปรึกษา: 2 ปีนับจากวันสิ้นสุดการปรึกษา เพื่อพิจารณาข้อร้องเรียน",
          "เอกสารยืนยันตัวตนและคุณวุฒิของผู้ให้คำปรึกษา: ตลอดเวลาที่เปิดให้บริการ และ 1 ปีหลังเลิกให้บริการ",
          "ข้อมูลจราจรทางคอมพิวเตอร์: อย่างน้อย 90 วัน ตามที่กฎหมายกำหนด",
          "ข้อมูลที่เกี่ยวข้องกับข้อพิพาทหรือคดี: จนกว่าเรื่องจะถึงที่สุด และตามอายุความที่เกี่ยวข้อง",
        ],
      },
      {
        id: "security",
        title: "การรักษาความมั่นคงปลอดภัย",
        paragraphs: [
          "เราใช้มาตรการเชิงองค์กร เทคนิค และกายภาพที่เหมาะสม เช่น การเข้ารหัสข้อมูลระหว่างส่งด้วย TLS การเก็บรหัสผ่านแบบแฮช การจำกัดสิทธิ์เข้าถึงตามหน้าที่ การยืนยันตัวตนของเจ้าหน้าที่ การบันทึกและตรวจสอบการเข้าถึงข้อมูลสำคัญ และการสำรองข้อมูล",
          "หากเกิดเหตุละเมิดข้อมูลส่วนบุคคล เราจะแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลภายใน 72 ชั่วโมงนับแต่ทราบเหตุ เว้นแต่ไม่มีความเสี่ยงต่อสิทธิของคุณ และหากมีความเสี่ยงสูง จะแจ้งคุณพร้อมแนวทางเยียวยาโดยไม่ชักช้า",
          "ไม่มีระบบใดปลอดภัยได้ทั้งหมด โปรดช่วยกันดูแลโดยใช้รหัสผ่านที่คาดเดายาก ไม่ใช้ซ้ำกับบริการอื่น และไม่เปิดเผยให้ผู้อื่น",
        ],
      },
      {
        id: "rights",
        title: "สิทธิของเจ้าของข้อมูลส่วนบุคคล",
        paragraphs: ["ภายใต้กฎหมายคุ้มครองข้อมูล คุณมีสิทธิดังต่อไปนี้"],
        bullets: [
          "สิทธิขอเข้าถึงและขอรับสำเนาข้อมูลของคุณ รวมถึงขอให้เปิดเผยที่มาของข้อมูลที่ไม่ได้มาจากคุณ (มาตรา 30)",
          "สิทธิขอรับหรือขอให้โอนย้ายข้อมูลในรูปแบบที่อ่านได้ด้วยเครื่องมืออัตโนมัติ (มาตรา 31)",
          "สิทธิคัดค้านการเก็บ ใช้ หรือเปิดเผยข้อมูล รวมถึงเพื่อการตลาดแบบตรง (มาตรา 32)",
          "สิทธิขอให้ลบ ทำลาย หรือทำให้ข้อมูลระบุตัวไม่ได้ (มาตรา 33)",
          "สิทธิขอให้ระงับการใช้ข้อมูล (มาตรา 34)",
          "สิทธิขอให้แก้ไขข้อมูลให้ถูกต้อง เป็นปัจจุบัน และสมบูรณ์ (มาตรา 35)",
          "สิทธิถอนความยินยอมเมื่อใดก็ได้ (มาตรา 19)",
          "สิทธิร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (มาตรา 73)",
        ],
        subsections: [
          {
            title: "วิธีใช้สิทธิ",
            paragraphs: [
              "คุณแก้ไขข้อมูลบัญชีและโปรไฟล์ได้เองที่หน้าการตั้งค่า สำหรับสิทธิอื่น ส่งคำขอทางอีเมลท้ายนโยบาย เราอาจขอข้อมูลเพื่อยืนยันว่าเป็นเจ้าของข้อมูลจริง และจะตอบภายใน 30 วันนับจากได้รับคำขอที่ครบถ้วน การใช้สิทธิไม่มีค่าใช้จ่าย เว้นแต่เป็นคำขอที่ไม่สมเหตุสมผลหรือซ้ำซ้อน",
            ],
          },
          {
            title: "กรณีที่อาจปฏิเสธคำขอ",
            paragraphs: [
              "เราอาจปฏิเสธหรือดำเนินการได้บางส่วน หากกฎหมายกำหนดให้ต้องเก็บข้อมูล หากจำเป็นเพื่อปฏิบัติตามสัญญา หรือเพื่อก่อตั้ง ใช้ หรือยกขึ้นต่อสู้สิทธิเรียกร้อง หรือหากคำขอกระทบสิทธิของบุคคลอื่น โดยเราจะแจ้งเหตุผลเป็นลายลักษณ์อักษร",
            ],
          },
          {
            title: "ผลของการถอนความยินยอม",
            paragraphs: [
              "การถอนความยินยอมไม่กระทบการประมวลผลที่ทำไปแล้วโดยชอบ หากคุณถอนความยินยอมในเรื่องที่จำเป็นต่อบริการ เช่น ผู้ให้คำปรึกษาถอนความยินยอมสำหรับเอกสารยืนยันตัวตน เราอาจไม่สามารถให้บริการส่วนนั้นต่อได้",
            ],
          },
        ],
      },
      {
        id: "cookies",
        title: "คุกกี้และเทคโนโลยีที่คล้ายกัน",
        paragraphs: ["คุกกี้คือไฟล์ขนาดเล็กที่เก็บในเบราว์เซอร์ของคุณ เราใช้คุกกี้และพื้นที่เก็บข้อมูลในเบราว์เซอร์ดังนี้"],
        bullets: [
          "คุกกี้ที่จำเป็น: ให้คุณเข้าสู่ระบบได้ รักษาความปลอดภัยของการเชื่อมต่อ และป้องกันการปลอมแปลงคำขอ ใช้ได้โดยไม่ต้องขอความยินยอม",
          "คุกกี้การตั้งค่า: จำภาษา เขตเวลา และการค้นหาล่าสุดของคุณ",
          "คุกกี้วิเคราะห์: วัดการใช้งานในภาพรวมเพื่อปรับปรุงแพลตฟอร์ม ใช้เมื่อคุณอนุญาตเท่านั้น",
        ],
        subsections: [
          {
            title: "การจัดการคุกกี้",
            paragraphs: [
              "คุณเปลี่ยนการตั้งค่าคุกกี้ได้ทุกเมื่อ และลบหรือปิดคุกกี้ได้จากการตั้งค่าเบราว์เซอร์ หากปิดคุกกี้ที่จำเป็น บางส่วนของแพลตฟอร์มอาจทำงานไม่ได้ เราไม่ใช้คุกกี้โฆษณาของบุคคลภายนอก",
            ],
          },
        ],
      },
      {
        id: "marketing",
        title: "ข่าวสารและการตลาด",
        paragraphs: [
          "เราจะส่งข่าวสาร โปรโมชั่น หรือแบบสอบถาม เมื่อคุณให้ความยินยอมเท่านั้น คุณยกเลิกได้ทุกเมื่อผ่านลิงก์ในอีเมลหรือหน้าการตั้งค่า การแจ้งเตือนที่จำเป็นต่อบริการ เช่น การยืนยันการจอง การชำระเงิน และการเปลี่ยนแปลงข้อกำหนด จะยังคงส่งถึงคุณ",
        ],
      },
      {
        id: "minors",
        title: "ข้อมูลของผู้เยาว์",
        paragraphs: [
          "แพลตฟอร์มไม่ได้มีไว้สำหรับผู้ที่ยังไม่บรรลุนิติภาวะ เว้นแต่ได้รับความยินยอมจากผู้ใช้อำนาจปกครองตามข้อกำหนดการให้บริการ เราไม่เก็บข้อมูลของผู้ที่อายุต่ำกว่า 10 ปีโดยเจตนา หากพบว่าเก็บข้อมูลของผู้เยาว์โดยไม่ได้รับความยินยอมตามกฎหมาย เราจะลบข้อมูลนั้นโดยเร็ว",
        ],
      },
      {
        id: "third-party",
        title: "เว็บไซต์และบริการของบุคคลภายนอก",
        paragraphs: [
          "แพลตฟอร์มอาจมีลิงก์หรือเชื่อมต่อกับบริการของบุคคลภายนอก เช่น ระบบเข้าสู่ระบบ ระบบชำระเงิน หรือการประชุมทางวิดีโอ การเก็บและใช้ข้อมูลของบริการเหล่านั้นเป็นไปตามนโยบายของผู้ให้บริการนั้น โปรดศึกษานโยบายของบริการดังกล่าวก่อนใช้งาน",
        ],
      },
      {
        id: "changes",
        title: "การเปลี่ยนแปลงนโยบาย",
        paragraphs: [
          "เราอาจปรับปรุงนโยบายนี้เพื่อให้สอดคล้องกับบริการ กฎหมาย หรือแนวปฏิบัติที่เปลี่ยนไป ฉบับปัจจุบันแสดงที่หน้านี้พร้อมวันที่มีผลเสมอ หากเป็นการเปลี่ยนแปลงสำคัญ เราจะแจ้งทางอีเมลหรือในแพลตฟอร์มก่อนวันที่มีผล และจะขอความยินยอมใหม่หากกฎหมายกำหนด",
        ],
      },
      {
        id: "contact",
        title: "การติดต่อและการร้องเรียน",
        paragraphs: [
          "หากมีคำถาม ต้องการใช้สิทธิ หรือพบว่าข้อมูลของคุณถูกใช้ไม่ถูกต้อง ติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลของเราได้ที่อีเมลด้านล่าง",
          "หากเห็นว่าเราไม่ปฏิบัติตามกฎหมายคุ้มครองข้อมูล คุณมีสิทธิร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ทางเว็บไซต์ www.pdpc.or.th",
        ],
      },
    ],
    contact: {
      body: "เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)",
      email: "privacy@advisory.co.th",
    },
  },

  en: {
    title: "Privacy Policy",
    effective: "In effect from 24 October 2026",
    version: "Version 2026.10",
    lead: [
      "Advisory Platform (\"we\") takes your privacy seriously. This policy explains how we collect, use, disclose and protect your personal data when you use our website, applications and services (the \"Platform\"), under Thailand's Personal Data Protection Act B.E. 2562 (2019) and related laws (\"data protection law\").",
      "Please read it together with our Terms of Service. If you do not want us to process your data as described, you may not be able to use parts of the service.",
    ],
    sections: [
      {
        id: "controller",
        title: "The data controller",
        paragraphs: [
          "Advisory Platform is the data controller for data collected through the Platform, and has appointed a Data Protection Officer (DPO) to oversee this policy, reachable at the email at the end.",
          "During a session, each advisor may be a separate controller of what you tell them, and must protect it under the law and our Terms of Service.",
        ],
      },
      {
        id: "scope",
        title: "Scope",
        paragraphs: [
          "This policy applies to visitors, advisees, advisors and anyone who contacts us. It does not cover third-party websites, apps or services linked from the Platform, which have their own policies.",
        ],
      },
      {
        id: "collect",
        title: "What we collect",
        subsections: [
          {
            title: "What you give us",
            bullets: [
              "Identity and contact data: display name, full name, email, phone number (if given) and profile photo.",
              "Account data: password (stored as an irreversible hash), time zone and language.",
              "Booking data: the service, the time and the matter you describe.",
              "Communications: chat messages, files and images, and anything you send our support team.",
              "Feedback: reviews, ratings and reports of inappropriate content.",
              "For advisors also: copies of identity documents, professional licences, qualifications, work history and the bank account for payouts.",
            ],
          },
          {
            title: "What is collected automatically",
            bullets: [
              "Device and connection data: IP address, device type, operating system, browser and device identifiers.",
              "Usage data: pages opened, searches, time and length of use, and system logs.",
              "Data from cookies and similar technologies, as in section 12.",
            ],
          },
          {
            title: "What others give us",
            bullets: [
              "Sign-in providers (Google, Facebook, Apple): the name, email and photo you allow.",
              "Payment providers: the payment result, transaction reference and the last four card digits (never the full card number or CVV).",
              "Other users: for example when an advisor replies to your review or someone reports your account.",
            ],
          },
        ],
      },
      {
        id: "purpose",
        title: "Purposes and legal bases",
        paragraphs: ["We process personal data only as needed, for these purposes and on these legal bases:"],
        subsections: [
          {
            title: "To perform our contract with you (section 24(3))",
            bullets: [
              "creating and maintaining your account and verifying sign-in;",
              "showing advisor profiles and managing bookings, rescheduling and cancellations;",
              "taking payment, holding funds, refunding and paying advisors;",
              "providing chat and booking notifications;",
              "providing support and deciding disputes.",
            ],
          },
          {
            title: "To comply with the law (section 24(6))",
            bullets: [
              "preparing and keeping accounting and tax records;",
              "reporting to authorities as required, such as the Revenue Department;",
              "complying with court orders, summonses or requests from competent authorities;",
              "retaining computer traffic data under the Computer-related Crime Act.",
            ],
          },
          {
            title: "For our legitimate interests (section 24(5))",
            bullets: [
              "checking advisors' documents and qualifications to keep advisees safe;",
              "preventing, detecting and investigating fraud, fake reviews, spam and breaches of our Terms;",
              "securing our systems and your account;",
              "analysing aggregate use to improve the Platform and suggest relevant advisors;",
              "establishing, exercising or defending legal claims.",
            ],
          },
          {
            title: "With your consent (sections 19 and 26)",
            bullets: [
              "processing sensitive data as in section 5;",
              "sending news, offers and surveys as in section 13;",
              "using non-essential cookies as in section 12.",
            ],
          },
        ],
      },
      {
        id: "sensitive",
        title: "Sensitive personal data",
        paragraphs: [
          "Identity documents advisors submit, such as a national ID card, may show sensitive data such as religion or blood group. We ask for explicit consent before collecting them, use them only to verify identity, limit access to verification staff, and recommend masking anything not needed before uploading.",
          "If you share health, belief or other personal matters in a booking or session, you explicitly consent to that information reaching the advisor on that booking so you can receive advice. It is never used for marketing or recommendations, and our team accesses it only to decide a complaint or where the law requires.",
          "We do not collect biometric data (such as face or fingerprint matching) or criminal records, unless we tell you and ask for separate consent in future.",
        ],
      },
      {
        id: "automated",
        title: "Automated processing",
        paragraphs: [
          "We use automated systems to rank and suggest advisors from categories, searches and review scores, and to detect anomalies that may indicate fraud. We do not make decisions that significantly affect you by automated means alone: suspending an account or refusing a refund is always reviewed by a person.",
        ],
      },
      {
        id: "share",
        title: "Who we share data with",
        paragraphs: [
          "We never sell, rent or trade your personal data for anyone else's advertising. We disclose only what is needed to:",
        ],
        bullets: [
          "the advisor you book: your display name, photo, booking details and chat messages. Advisors do not see your email, phone number or payment details;",
          "advisees: an advisor's public profile, such as name, photo, verified qualifications, services and reviews;",
          "payment providers and banks, to take payments, refund and pay out;",
          "processors working for us, such as cloud, database, file storage, email and analytics providers, under contracts requiring them to follow our instructions and keep data confidential;",
          "our professional advisers, such as lawyers and auditors, under duties of confidentiality;",
          "authorities, courts or competent officers, where the law requires or to protect life and safety;",
          "a successor in a merger or transfer of the business, who must keep protecting the data under this policy.",
        ],
      },
      {
        id: "transfer",
        title: "Transfers outside Thailand",
        paragraphs: [
          "Some of our processors have servers outside Thailand. When data is sent abroad we follow sections 28 and 29 of the Personal Data Protection Act, for example by sending it to countries with adequate protection, using standard contractual clauses or other appropriate safeguards, or where it is necessary to perform our contract with you.",
        ],
      },
      {
        id: "retention",
        title: "How long we keep data",
        paragraphs: [
          "We keep data only as long as its purpose requires, then delete, destroy or anonymise it.",
        ],
        bullets: [
          "Account and profile data: while your account is open, and no more than 90 days after it is closed.",
          "Booking, payment and receipt records: 10 years from the transaction, under accounting law and the Revenue Code.",
          "Chat messages and session files: 2 years after the session ends, for handling complaints.",
          "Advisor identity and qualification documents: while offering services, and 1 year after stopping.",
          "Computer traffic data: at least 90 days, as the law requires.",
          "Data relating to a dispute or legal case: until it is finally resolved, and for the relevant limitation period.",
        ],
      },
      {
        id: "security",
        title: "Security",
        paragraphs: [
          "We use appropriate organisational, technical and physical measures, such as TLS encryption in transit, hashed passwords, role-based access, staff authentication, logging and review of access to sensitive records, and backups.",
          "If a personal data breach occurs, we will notify the Personal Data Protection Committee within 72 hours of becoming aware of it, unless it poses no risk to your rights, and where the risk is high we will tell you without delay, with steps you can take.",
          "No system is completely secure. Please help by using a strong password that you do not reuse elsewhere, and never sharing it.",
        ],
      },
      {
        id: "rights",
        title: "Your rights",
        paragraphs: ["Under data protection law, you have the right to:"],
        bullets: [
          "access and obtain a copy of your data, including the source of data not obtained from you (section 30);",
          "receive or have your data transferred in a machine-readable format (section 31);",
          "object to collection, use or disclosure, including for direct marketing (section 32);",
          "have your data deleted, destroyed or anonymised (section 33);",
          "restrict the use of your data (section 34);",
          "have your data corrected, kept current and complete (section 35);",
          "withdraw consent at any time (section 19);",
          "complain to the Personal Data Protection Committee (section 73).",
        ],
        subsections: [
          {
            title: "How to exercise them",
            paragraphs: [
              "You can correct your account and profile yourself in Settings. For anything else, email the address at the end of this policy. We may ask for information to confirm you are the data subject, and will reply within 30 days of a complete request. Exercising your rights is free, unless a request is manifestly unreasonable or repetitive.",
            ],
          },
          {
            title: "When we may decline",
            paragraphs: [
              "We may decline or act only in part where the law requires us to keep the data, where it is needed to perform a contract or to establish, exercise or defend legal claims, or where a request would affect others' rights. We will give our reasons in writing.",
            ],
          },
          {
            title: "Withdrawing consent",
            paragraphs: [
              "Withdrawing consent does not affect processing already lawfully done. If you withdraw consent needed for a service, for example an advisor withdrawing consent for identity documents, we may be unable to continue that part of the service.",
            ],
          },
        ],
      },
      {
        id: "cookies",
        title: "Cookies and similar technologies",
        paragraphs: ["Cookies are small files stored in your browser. We use cookies and browser storage as follows:"],
        bullets: [
          "Essential cookies: keep you signed in, secure the connection and prevent request forgery. These do not need consent.",
          "Preference cookies: remember your language, time zone and recent searches.",
          "Analytics cookies: measure aggregate use to improve the Platform, only with your permission.",
        ],
        subsections: [
          {
            title: "Managing cookies",
            paragraphs: [
              "You can change your cookie settings at any time, and delete or block cookies in your browser. Blocking essential cookies may stop parts of the Platform from working. We do not use third-party advertising cookies.",
            ],
          },
        ],
      },
      {
        id: "marketing",
        title: "News and marketing",
        paragraphs: [
          "We send news, offers or surveys only with your consent, and you can unsubscribe at any time from the link in the email or in Settings. Messages needed for the service, such as booking confirmations, payments and changes to our terms, will still reach you.",
        ],
      },
      {
        id: "minors",
        title: "Minors",
        paragraphs: [
          "The Platform is not meant for anyone who has not reached majority, except with the consent of a person exercising parental authority under our Terms of Service. We do not knowingly collect data from anyone under 10. If we learn we hold a minor's data without lawful consent, we will delete it promptly.",
        ],
      },
      {
        id: "third-party",
        title: "Third-party websites and services",
        paragraphs: [
          "The Platform may link to or connect with third-party services such as sign-in, payments or video meetings. Their collection and use of data is governed by their own policies; please read them before use.",
        ],
      },
      {
        id: "changes",
        title: "Changes to this policy",
        paragraphs: [
          "We may update this policy as our services, the law or good practice change. The current version, with its effective date, is always on this page. For significant changes we will tell you by email or on the Platform before they take effect, and ask for fresh consent where the law requires.",
        ],
      },
      {
        id: "contact",
        title: "Contact and complaints",
        paragraphs: [
          "If you have a question, want to exercise your rights, or believe your data has been misused, contact our Data Protection Officer at the email below.",
          "If you believe we have not complied with data protection law, you may complain to the Office of the Personal Data Protection Committee (PDPC) at www.pdpc.or.th.",
        ],
      },
    ],
    contact: {
      body: "Data Protection Officer (DPO):",
      email: "privacy@advisory.co.th",
    },
  },
};
