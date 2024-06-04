import Bun from "bun";
import puppeteer from "puppeteer";

type HandlerParams = { request: Request; url: URL };
type Handler = ({ request, url }: HandlerParams) => Promise<Response>;

const listagemProdutosUrl = "http://localhost:3000/relatorio/listagem/produtos";

async function redirecionarParaRelatorioPdf() {
	return new Response("", {
		status: 303,
		headers: {
			Location: "/relatorio/listagem/produtos/pdf",
		},
	});
}

async function relatorioListagemProdutos({
	request,
	url,
}: HandlerParams): Promise<Response> {
	console.info(Date.now(), "[RELATORIO] ListagemProdutos");
	const htmlContent = `
  <html>
    <head>
      <title>Relatório de Produtos</title>
    </head>
    <body>
      <!-- <h1>Relatório de Produtos</h1> -->
      <table border="1" cellpadding="5" cellspacing="0.5" width="100%">
        <thead>
          <tr>
          ${`
            <th>ID</th>
            <th>Nome</th>
            <th>Preço</th>
          `.repeat(4)}
          </tr>
        </thead>
        <tbody>
          ${`
          <tr>
            ${`
            <td>1</td>
            <td>Produto A</td>
            <td>R$ 10,00</td>
            `.repeat(4)}
          </tr>
          <tr>
            ${`
            <td>2</td>
            <td>Produto B</td>
            <td>R$ 20,00</td>
            `.repeat(4)}
          </tr>`.repeat(100)}
        </tbody>
      </table>
    </body>
  </html>
`;
	return new Response(htmlContent, {
		headers: { "content-type": "text/html;charset=utf-8" },
	});
}

async function relatorioListagemProdutosPDF({
	request,
	url,
}: HandlerParams): Promise<Response> {
	const inicio = Date.now();
	console.info(inicio, "[RELATORIO] listagemProdutosPDF #begin");
	try {
		const response = await fetch(listagemProdutosUrl);
		const htmlContent = await response.text();

		const browser = await puppeteer.launch({ headless: true });
		const page = await browser.newPage();
		await page.setContent(htmlContent, { waitUntil: "networkidle0" });
		const pdf = await page.pdf({
			format: "A4",
			margin: { top: "64px", left: "15px", bottom: "32px", right: "15px" },
			displayHeaderFooter: true,
			headerTemplate: `
        <div style="display:flex;align-items: baseline;justify-content: space-between;width:100%">
          <div>
            <span style="margin-left:32px;font-size:24px"> Listagem de Produtos </span>
          </div>
          <div style="margin-right:32px;font-size:12px">
            <span class="date"></span> - Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        </div>`,
			footerTemplate: `
        <div style="font-size:10px; text-align: center; width: 100%;">
          <span class="title"></span>
        </div>`,
		});
		await browser.close();

		return new Response(pdf, {
			headers: {
				"Content-Type": "application/pdf",
			},
		});
	} catch (error) {
		console.error(error);
		return new Response("Erro ao gerar o PDF", { status: 500 });
	} finally {
		const fim = Date.now();
		console.info(
			fim,
			"[RELATORIO] listagemProdutosPDF #end -",
			fim - inicio,
			"ms",
		);
	}
}

const app = Bun.serve({
	async fetch(request) {
		const url = new URL(request.url);
		const handler: Handler | undefined = {
			"/": redirecionarParaRelatorioPdf,
			"/relatorio/listagem/produtos": relatorioListagemProdutos,
			"/relatorio/listagem/produtos/pdf": relatorioListagemProdutosPDF,
		}[url.pathname];

		if (!handler) {
			return new Response("nao encontrado", { status: 404 });
		}

		return await handler({ request, url });
	},
});

console.info(`ouvindo requisicoes em http://${app.hostname}:${app.port}`);
