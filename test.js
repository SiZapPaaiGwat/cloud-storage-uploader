const { upload } = require('./index.js')

async function test () {
  await upload({
    filename: `${__dirname}/test.js`,
    key: 'test.js',
    qcloud: {
      sid: process.env.QCLOUD_SID,
      skey: process.env.QCLOUD_SKEY,
      bucket: process.env.QCLOUD_BUCKET,
      region: process.env.QCLOUD_REGION
    },
    s3: {
      transform: key => `static/${key}`,
      bucket: process.env.S3_BUCKET
    }
  })
}

test().catch(err => {
  console.log(err)
  process.exit(1)
})