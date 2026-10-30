import { TaxonomyEditScreen } from "@/components/cms/screens/catalog-edit";

/** `/admin/manage/skill?id=…` — a skill, created (`id=new`) or edited on its own page. */
export default function SkillEditPage() {
  return <TaxonomyEditScreen kind="skills" />;
}
