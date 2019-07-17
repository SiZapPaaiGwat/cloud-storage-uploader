const COS = require('cos-nodejs-sdk-v5')
const AWS = require('aws-sdk')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

let s3Client, cosClient

function gzip (buff) {
  return new Promise((resolve, reject) => {
    zlib.gzip(buff, (err, result) => {
      err ? reject(err) : resolve(result)
    })
  })
}

function useGzip (filename) {
  return /\.(css|js|html|htm|md|json|svg|map|txt|log)$/i.test(filename)
}

function readFileBuffer (filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, function (err, buff) {
      err ? reject(err) : resolve(buff)
    })
  })
}

function uploadQcloud ({ body, key, isGzip, bucket, region, transform }) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucket,
      Region: region,
      Key: typeof transform === 'function' ? transform(key) : key,
      ContentLength: body.length,
      Body: body
    }
    if (isGzip) {
      params.ContentEncoding = 'gzip'
    }
    cosClient.putObject(params, function (err, data) {
      if (err) {
        console.log(`**** upload cos error = ${key} ****`)
        console.log(err)
        reject(err)
      } else {
        console.log(`**** upload cos success = ${key} ****`)
        resolve(data)
      }
    })
  })
}

function uploadS3 ({ body, key, isGzip, bucket, region, transform }) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucket,
      ACL: 'public-read',
      Key: typeof transform === 'function' ? transform(key) : key,
      ContentLength: body.length,
      Body: body
    }
    if (isGzip) {
      params.ContentEncoding = 'gzip'
    }
    s3Client.putObject(params, function (err, data) {
      if (err) {
        console.log(`**** upload aws error = ${key} ****`)
        console.log(err)
        reject(err)
      } else {
        console.log(`**** upload aws success = ${key} ****`)
        resolve(data)
      }
    })
  })
}

async function upload ({filename, key, s3 = { disable: true }, qcloud = { disable: true }}) {
  let buffer = await readFileBuffer(filename)
  const isGzip = useGzip(key)
  buffer = isGzip ? await gzip(buffer) : buffer
  const params = {
    body: buffer,
    isGzip,
    key
  }
  const task = []

  if (!qcloud.disable) {
    if (!cosClient) {
      // 创建实例
      cosClient = new COS({
        SecretId: qcloud.sid,
        SecretKey: qcloud.skey
      })
    }
    task.push(uploadQcloud({...params, ...qcloud}))
  }
  if (!s3.disable) {
    if (!s3Client) {
      /**
       * Using IAM Roles
       */
      // AWS.config.credentials = new AWS.SharedIniFileCredentials()
      s3Client = new AWS.S3({
        apiVersion: '2006-03-01'
      })
    }

    task.push(uploadS3({...params, ...s3}))
  }

  await Promise.all(task)
}

exports.upload = upload