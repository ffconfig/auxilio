require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

console.log("CI:", process.env.VEXO_CI);
console.log("CS:", process.env.VEXO_CS);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const headers = {
  ci: process.env.VEXO_CI,
  cs: process.env.VEXO_CS,
  "Content-Type": "application/json",
};

// BANCO DE KEYS EM MEMÓRIA
const keys = [];

// GERADOR DE KEY
function gerarKey() {

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let key = "FF-";

  for(let i = 0; i < 16; i++){

    key += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return key;
}

// CRIAR PIX
app.post("/criar-pix", async (req, res) => {

  try {

    const {
      amount,
      payerName,
      payerDocument,
      description,
      externalId,
    } = req.body;

    const response = await axios.post(
      "https://www.vexopay.com.br/api/gateway/pix-create",
      {
        amount,
        payerName,
        payerDocument,
        description,
        externalId,
      },
      { headers }
    );

    const data = response.data.data;

    return res.json({
      success: true,
      copyPaste: data.copyPaste,
      qrCodeBase64: data.qrCodeBase64,
      transactionId: data.transactionId,
      status: data.status,
    });

  } catch (error) {

    console.log("ERRO COMPLETO:");

    console.log(
      JSON.stringify(
        error.response?.data,
        null,
        2
      )
    );

    return res.status(500).json({
      success: false,
      error:
        error.response?.data ||
        error.message,
    });
  }
});

// STATUS PIX + GERAR KEY
app.get("/status", async (req, res) => {

  try {

    const { transactionId } = req.query;

    const response = await axios.get(
      `https://www.vexopay.com.br/api/gateway/pix-status?transactionId=${transactionId}`,
      { headers }
    );

    const data = response.data;

    // SE PAGOU
    if(data?.data?.status === "paid"){

      // VERIFICA SE JÁ TEM KEY
      let keyExistente =
        keys.find(
          k => k.transactionId === transactionId
        );

      // SE NÃO TIVER, CRIA
      if(!keyExistente){

        const novaKey = gerarKey();

        keyExistente = {
          transactionId,
          key: novaKey
        };

        keys.push(keyExistente);

        console.log("NOVA KEY:", novaKey);
      }

      data.key = keyExistente.key;
    }

    return res.json(data);

  } catch (error) {

    console.log(
      error.response?.data ||
      error.message
    );

    return res.status(500).json({
      success:false,
      error:error.response?.data || error.message
    });
  }
});

// INICIAR SERVIDOR
app.listen(process.env.PORT || 3000, () => {

  console.log(
    `Servidor rodando em http://localhost:${process.env.PORT || 3000}`
  );

});