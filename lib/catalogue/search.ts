import {
  advisorList,
  services,
  type Advisor,
  type Service,
} from "@/lib/catalogue/services";

/**
 * The catalogue matched against what somebody typed, shared by the home hero's
 * suggestions and the `/search` results so the two never disagree about what
 * a query turns up.
 *
 * A plain substring match, folded for case: the catalogue is a few dozen
 * records and Thai has no word breaks to tokenise on, so anything cleverer
 * would be guessing. A service matches on its title, category, topics or
 * summary; an advisor on their name or field.
 */
export function normalise(value: string): string {
  return value.trim().toLocaleLowerCase("th");
}

export function matchServices(query: string): ReadonlyArray<Service> {
  const q = normalise(query);
  if (!q) return [];
  return services.filter((service) =>
    [service.title, service.category, service.summary, ...service.topics].some((field) =>
      normalise(field).includes(q),
    ),
  );
}

export function matchAdvisors(query: string): ReadonlyArray<Advisor> {
  const q = normalise(query);
  if (!q) return [];
  return advisorList.filter((advisor) =>
    [advisor.name, advisor.field].some((field) => normalise(field).includes(q)),
  );
}
