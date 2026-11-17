/**
 * Server-rendered tutorial page: the same article, category list or tip the interactive Learning Center shows,
 * written into the HTML so search engines and AI crawlers (which do not run the client loader) can read it.
 * TutorialsClient shows it until the client has loaded its own data.
 */
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { preprocessImgSize } from "@/lib/tutorials/markdown";
import type { ResolvedTutorial } from "@/lib/tutorials/server";
import type { Category } from "@/lib/tutorials/types";
import { getActiveChildren } from "@/lib/tutorials/categories";

// Theme-neutral prose: the visitor's theme is only known on the client.
const PROSE = "prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-a:text-primary";

function CategoryLinks({ id, categories }: { id: string; categories: Category[] }) {
    return (<ul id={id} className="space-y-1">
      {categories.map((cat) => (<li key={cat.id} id={`${id}-${cat.slug}`}>
          <a id={`${id}-${cat.slug}-link`} href={`/tutorials/${cat.path}`} className="text-primary hover:underline">{cat.name}</a>
          {getActiveChildren(cat).length > 0 && (<CategoryLinks id={`${id}-${cat.slug}`} categories={getActiveChildren(cat)}/>)}
        </li>))}
    </ul>);
}

export type ServerViewData =
    | ResolvedTutorial
    | { kind: "index"; roots: Category[] }
    | { kind: "static"; title: string; body: string; /** the article's path under /tutorials */ path: string; bordered: boolean };

export function TutorialServerView({ data }: { data: ServerViewData }) {
    if (data.kind === "content") {
        const { content } = data;
        return (<article id="tutorials-server-article" className="border rounded-lg p-4 sm:p-6">
        <h2 id="tutorials-server-article-title" className="text-2xl font-bold break-words mb-4 sm:text-3xl lg:text-4xl">{content.title}</h2>
        {content.body && (<div id="tutorials-server-article-body" className={PROSE}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{preprocessImgSize(content.body)}</ReactMarkdown>
          </div>)}
      </article>);
    }
    if (data.kind === "static") {
        return (<article id="tutorials-server-static" className={data.bordered ? "border rounded-lg p-4 sm:p-6" : undefined}>
        <h2 id="tutorials-server-static-title" className="text-2xl font-bold break-words mb-4 sm:text-3xl lg:text-4xl">{data.title}</h2>
        <div id="tutorials-server-static-body" className={PROSE}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.body}</ReactMarkdown>
        </div>
      </article>);
    }
    if (data.kind === "category") {
        const { category, children, items } = data;
        return (<section id="tutorials-server-category">
        <h2 id="tutorials-server-category-title" className="text-xl font-semibold mb-2">{category.name}</h2>
        {category.description && (<p id="tutorials-server-category-description" className="text-sm text-muted-foreground mb-4">{category.description}</p>)}
        {children.length > 0 ? (<CategoryLinks id="tutorials-server-category-children" categories={children}/>) : (<ul id="tutorials-server-category-items" className="space-y-2">
            {items.map((item) => (<li key={item.id} id={`tutorials-server-category-item-${item.id}`}>
                <a id={`tutorials-server-category-item-${item.id}-link`} href={`/tutorials/${category.path}/${item.slug}`} className="font-medium text-primary hover:underline">{item.title}</a>
                {item.description && (<p id={`tutorials-server-category-item-${item.id}-description`} className="text-sm text-muted-foreground">{item.description}</p>)}
              </li>))}
          </ul>)}
      </section>);
    }
    // the page's "Learning Center" heading (TutorialsClient) titles this list
    return (<nav id="tutorials-server-index">
      <CategoryLinks id="tutorials-server-index-categories" categories={data.roots}/>
    </nav>);
}
