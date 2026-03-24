import dns from "dns/promises";
import net from "net";

async function checkMailbox(email) {
  const domain = email.split("@")[1];

  try {
    const mxRecords = await dns.resolveMx(domain);
    const mxHost = mxRecords[0].exchange;

    const socket = net.createConnection(25, mxHost);

    socket.write(`RCPT TO:<${email}>\r\n`);

    socket.on("data", (data) => {
      console.log(data.toString());
      socket.end();
    });

  } catch (error) {
    console.log("Mailbox check failed");
  }
}

checkMailbox("angshruta.bhuyan@hexahealth.com");