import { createArticle } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function ArticlesPage() {
  const [publishers, categories, articles] = await Promise.all([
    prisma.publisher.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.article.findMany({ include: { category: true, publisher: true }, orderBy: { createdAt: "desc" }, take: 24 })
  ]);

  return (
    <section>
      <h1 className="font-display text-7xl uppercase">Articles</h1>
      <p className="mt-2 max-w-3xl font-bold">Create local Potty Favor content blocks that can be placed between persistent sponsor positions in the issue builder.</p>
      <form action={createArticle} className="mt-4 grid gap-3 rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal md:grid-cols-2">
        <select name="publisherId" required className="rounded border-2 border-ink p-3 font-bold">
          {publishers.map((publisher) => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}
        </select>
        <select name="categoryId" className="rounded border-2 border-ink p-3 font-bold">
          <option value="">No category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input name="title" placeholder="Article title" required className="rounded border-2 border-ink p-3" />
        <input name="slug" placeholder="optional-slug" className="rounded border-2 border-ink p-3" />
        <input name="excerpt" placeholder="Short excerpt" required className="rounded border-2 border-ink p-3 md:col-span-2" />
        <textarea name="body" placeholder="Article body" required className="min-h-32 rounded border-2 border-ink p-3 md:col-span-2" />
        <input name="imageUrl" placeholder="Image URL" className="rounded border-2 border-ink p-3" />
        <select name="status" className="rounded border-2 border-ink p-3 font-bold">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className="rounded bg-ink p-3 font-black uppercase text-white md:col-span-2">Add Article</button>
      </form>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {articles.map((article) => (
          <article key={article.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
            <p className="text-xs font-black uppercase text-stallRed">{article.status} • {article.category?.name || "Uncategorized"}</p>
            <h2 className="font-display text-4xl uppercase leading-none">{article.title}</h2>
            <p className="mt-2 font-bold">{article.excerpt}</p>
            <p className="mt-3 text-xs font-black uppercase text-stallPurple">{article.publisher.name}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
