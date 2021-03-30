import { v4 as uuidv4 } from 'uuid'

type InterceptorManagerHandler<V> = {
  fulfilled: (value: V) => V | Promise<V>
  rejected: (error: any) => any
}

class InterceptorManager<V> {
  private handlers: (InterceptorManagerHandler<V> | null)[] = []

  public use(fulfilled: (value: V) => V | Promise<V>, rejected: (error: any) => any): number {
    this.handlers.push({
      fulfilled,
      rejected,
    })
    return this.handlers.length - 1
  }

  public eject(id: number) {
    if (this.handlers[id]) {
      this.handlers[id] = null
    }
  }

  public forEach(fn: (handler: InterceptorManagerHandler<V>) => void) {
    this.handlers.forEach((_) => _ && fn(_))
  }
}

export interface IHttpTransformer {
  (data: any, headers?: any): any
}
export interface IHttpRequestConfig {
  url?: string
  method?: 'POST' | 'GET'
  baseURL?: string
  transformRequest?: IHttpTransformer[]
  transformResponse?: IHttpTransformer[]
  headers?: any
  params?: any
  data?: any
  timeout?: number
  responseType?: 'json' | 'blob' | 'text'
}

export interface IHttpResponse<T = any> {
  config: IHttpRequestConfig
  request: Request
  response: Response
  data: T
  status: number
  statusText: string
  headers: Headers
}

const defaults: IHttpRequestConfig = {
  url: '',
  method: 'GET',
  baseURL: '',
  headers: {},
  responseType: 'json',
  transformRequest: [
    (data: any) => {
      return JSON.stringify(data)
    },
  ],
  transformResponse: [],
}

export class Http {
  public interceptors = {
    request: new InterceptorManager<IHttpRequestConfig>(),
    response: new InterceptorManager<IHttpResponse>(),
  }

  public defaults: IHttpRequestConfig

  public constructor(config: IHttpRequestConfig = {}) {
    this.defaults = this.mergeConfig(defaults, config)
  }

  public dispatchRequest<T = any>(config: IHttpRequestConfig) {
    if (config.transformRequest) {
      config.data = config.transformRequest.reduce(
        (data, fn) => fn(data, config.headers),
        config.data
      )
    }

    const request = new Request(this.buildURL(config.url, config.params), {
      method: config.method,
      headers: config.headers,
      body: config.data,
    })

    return fetch(request).then(
      (response) => {
        let handle: () => Promise<any>

        switch (config.responseType) {
          case 'json':
            handle = response.json
            break
          case 'blob':
            handle = response.blob
            break
          case 'text':
            handle = response.text
            break
          default:
            handle = () => Promise.resolve(response.body)
            break
        }

        handle().then((data) => {
          if (config.transformResponse) {
            data = config.transformResponse.reduce((data, fn) => fn(data, response.headers), data)
          }

          const pack: IHttpResponse = {
            config,
            request,
            response,
            data: data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          }

          return pack
        })

        // if (this.config.responseType === 'json') {
        //   response.json().then((pack: IResponsePack) => {
        //     if (pack.resource === '') {
        //       return resolve({
        //         pack,
        //         response,
        //         resource: (pack.resource as unknown) as T,
        //       })
        //     } else {
        //       try {
        //         const resource = JSON.parse(pack.resource)
        //         return resolve({
        //           pack,
        //           response,
        //           resource,
        //         })
        //       } catch (error) {
        //         return reject('fetch: Resource is not JSON')
        //         // throw new Error('fetch: Resource is not JSON')
        //       }
        //     }
        //   })
        // }
      },
      (reason) => {}
    )
  }

  public request<T = any>(config: IHttpRequestConfig = {}) {
    config = this.mergeConfig(this.defaults, config)

    const chain: any[] = [(_: IHttpRequestConfig) => this.dispatchRequest<T>(_), undefined]
    let promise: any = Promise.resolve(config)

    this.interceptors.request.forEach((interceptor) =>
      chain.unshift(interceptor.fulfilled, interceptor.rejected)
    )

    this.interceptors.response.forEach((interceptor) =>
      chain.push(interceptor.fulfilled, interceptor.rejected)
    )

    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift())
    }

    return promise
  }

  public buildURL(url: string = '', params: any): string {
    if (!params) return url

    const parts = []
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const value = params[key]
        parts.push(key + '=' + value)
      }
    }
    return url + '?' + parts.join('&')
  }

  private static config: IHttpRequestConfig

  public static setconfig(config: IHttpRequestConfig) {
    Http.config = config
  }

  public mergeConfig(o1: IHttpRequestConfig, o2: IHttpRequestConfig): IHttpRequestConfig {
    let o = { ...o1, ...o2 }
    if (o1.headers && o2.headers) {
      o.headers = { ...o1.headers, ...o2.headers }
    }
    return o
  }
}

Http.setconfig({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  responseType: 'json',
})

export interface IRequestPack {
  passport: string
  session: string
  resource: string
  sign: string
  other: null
}

export interface IResponsePack {
  code: number
  message: string
  success: boolean
  session: string
  resource: string
  sign: string
  other: null
}

export const createRequestPack = (rawResource?: any): string => {
  return JSON.stringify({
    passport: localStorage.getItem('__PASSPORT'),
    session: uuidv4(),
    resource: rawResource === undefined ? '' : JSON.stringify(rawResource),
    sign: '',
    other: null,
  })
}
