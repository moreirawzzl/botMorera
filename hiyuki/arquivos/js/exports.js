function convertWhatsAppUser(value) {
  if (!value) return ''
  const jid = String(value).replace(/:\d+(?=@)/, '')
  return /^\d+$/.test(jid) ? jid + '@s.whatsapp.net' : jid
}
function member(id, group) {
  return group.find(m => [m.id, m.lid, m.phoneNumber].filter(Boolean).some(jid => convertWhatsAppUser(jid) === convertWhatsAppUser(id)))
}
function getPhoneNumberFromId(id, group) {
  return convertWhatsAppUser(member(id, group)?.phoneNumber || id)
}
function getMemberName(id, group) {
  return member(id, group)?.notify || id.split('@')[0]
}
module.exports = { convertWhatsAppUser, getPhoneNumberFromId, getMemberName }
