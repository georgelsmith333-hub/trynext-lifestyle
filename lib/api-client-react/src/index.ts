export * from "./generated/api";
export * from "./generated/api.schemas";
export { ApiError, setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

// ─── Core domain types (defined in trynext-hooks.ts because generated/api is a skeleton) ───
export type {
  Product,
  Category,
  Order,
  BlogPost,
  SiteSettings,
  Testimonial,
  OrderItem,
  AdminCustomer,
  AdminStatsWeeklyDataItem,
  AdminStatsPaymentDistributionItem,
  CreateOrderRequest,
  CreateProductRequest,
  UpdateProductRequest,
  Review,
  BlogPostInput,
  DesignerSettings,
  FacebookPost,
  FetchSocialUrl200Post,
  BlogSettings,
  AdminGuestCustomer,
} from "./trynext-hooks";

// ─── Named hooks from trynext-hooks.ts ───
export {
  CreateOrderRequestPaymentMethod,
  UpdateOrderStatusRequestStatus,
  // product
  getTrynexListProductsQueryKey,
  useTrynexListProducts,
  useTrynexGetProduct,
  useTrynexCreateProduct,
  useTrynexUpdateProduct,
  useTrynexDeleteProduct,
  useToggleProductFeatured,
  // category
  useTrynexListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  // order
  useCreateOrder,
  useTrackOrder,
  getTrynexListOrdersQueryKey,
  useTrynexListOrders,
  useUpdateOrderStatus,
  useUpdatePaymentStatus,
  // settings
  useGetSettings,
  useUpdateSettings,
  useGetDesignerSettings,
  usePatchDesignerSettings,
  // testimonial
  useGetTestimonials,
  useAdminListTestimonials,
  useCreateTestimonial,
  useUpdateTestimonial,
  useDeleteTestimonial,
  // admin
  useTrynexAdminLogin,
  useTrynexAdminLogout,
  useAdminMe,
  useTrynexGetAdminStats,
  // customer
  useListAdminCustomers,
  useListAdminGuestCustomers,
  useConvertGuestCustomer,
  useDeleteGuestCustomer,
  // blog
  useListBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  useGetBlogSettings,
  usePatchBlogSettings,
  // backup/export
  getExportBackupUrl,
  getExportOrdersCsvUrl,
  useImportBackup,
  // review
  useListAdminReviews,
  useApproveReview,
  useDeleteReview,
  // facebook/social
  useFetchFacebookPosts,
  useFetchSocialUrl,
  useImportFacebookProduct,
} from "./trynext-hooks";

// ─── Convenience aliases (storefront expects shorter names) ───
export {
  useTrynexListProducts as useListProducts,
  useTrynexGetProduct as useGetProduct,
  getTrynexListProductsQueryKey as getListProductsQueryKey,
  useTrynexListCategories as useListCategories,
  useTrynexListOrders as useListOrders,
  getTrynexListOrdersQueryKey as getListOrdersQueryKey,
  useTrynexCreateProduct as useCreateProduct,
  useTrynexUpdateProduct as useUpdateProduct,
  useTrynexDeleteProduct as useDeleteProduct,
  useTrynexGetAdminStats as useGetAdminStats,
  useTrynexAdminLogout as useAdminLogout,
} from "./trynext-hooks";
