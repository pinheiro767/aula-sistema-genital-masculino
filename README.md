# Atlas Imersivo PWA — 45 páginas

Aplicativo web progressivo configurado para carregar **exatamente 45 imagens**, numeradas de `1.png` a `45.png`, dentro de `assets/img/`.

## Recursos

- navegação por 45 páginas e miniaturas;
- zoom de 50% a 500%, arrastar e tela cheia;
- caneta, borracha, desfazer e notas por página;
- salvamento local automático;
- leitura em voz alta em português;
- OCR opcional com Tesseract.js;
- geração de PDF da página atual ou das 45 páginas;
- inclusão de imagens extras durante a sessão;
- acessibilidade por teclado e interface responsiva;
- instalação como PWA e funcionamento offline após o primeiro acesso.

## Substituir as páginas provisórias

Algumas imagens não foram fornecidas e estão representadas por páginas provisórias. Para substituí-las, coloque a imagem definitiva em `assets/img/` usando exatamente o número correspondente, por exemplo `4.png`, `5.png` ou `45.png`.

Não é necessário editar o código. Mantenha os nomes de `1.png` até `45.png`.

## Publicar no GitHub Pages

1. Envie todo o conteúdo desta pasta para a raiz de um repositório.
2. Acesse **Settings → Pages**.
3. Escolha **Deploy from a branch**, branch `main` e pasta `/root`.
4. Aguarde o endereço publicado.

## Teste local

```bash
python -m http.server 8080
```

Abra `http://localhost:8080`. O service worker requer HTTPS ou `localhost`.

## OCR: forma correta de abrir

O OCR precisa baixar o mecanismo e o idioma português na primeira utilização. Portanto:

- não abra o arquivo `index.html` diretamente com duplo clique;
- publique no GitHub Pages ou execute `python -m http.server 8080` na pasta do projeto;
- abra `http://localhost:8080` e mantenha a internet ativa no primeiro OCR;
- depois do primeiro carregamento, os arquivos usados pelo OCR ficam armazenados pelo navegador quando possível.

A versão 3 usa três provedores alternativos da biblioteca Tesseract.js, mostra o progresso real e corrige o service worker para não devolver o HTML no lugar dos arquivos do OCR.
