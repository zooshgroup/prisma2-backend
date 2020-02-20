const { Photon } = require('@prisma/photon')

const photon = new Photon()
exports.photonExample = async function helloWorld(req, res) {
  const users = await photon.users()
  res.status(200).send(JSON.stringify(users))
}
