import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import AdminOverview from './AdminOverview'
import AdminPersonalInfo from './AdminPersonalInfo'
import AdminSkills from './AdminSkills'
import AdminProjects from './AdminProjects'
import AdminEducation from './AdminEducation'
import AdminExperience from './AdminExperience'
import AdminBlog from './AdminBlog'
import AdminCaseStudies from './AdminCaseStudies'
import AdminCertificates from './AdminCertificates'
import AdminAchievements from './AdminAchievements'
import AdminGallery from './AdminGallery'
import AdminProducts from './AdminProducts'
import AdminOrders from './AdminOrders'
import AdminSocialLinks from './AdminSocialLinks'
import AdminReviews from './AdminReviews'
import AdminUsers from './AdminUsers'
import AdminContactMessages from './AdminContactMessages'
import AdminPayments from './AdminPayments'
import AdminAds from './AdminAds'
import AdminServices from './AdminServices'
import AdminCrmConfig from './AdminCrmConfig'
import AdminDocsConfig from './AdminDocsConfig'
import AdminAiAutomation from './AdminAiAutomation'
import AdminYouTubeConfig from './AdminYouTubeConfig'
import AdminPaymentSettings from './AdminPaymentSettings'
export default function AdminDashboard() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="personal-info" element={<AdminPersonalInfo />} />
        <Route path="skills" element={<AdminSkills />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="education" element={<AdminEducation />} />
        <Route path="experience" element={<AdminExperience />} />
        <Route path="blog" element={<AdminBlog />} />
        <Route path="case-studies" element={<AdminCaseStudies />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="achievements" element={<AdminAchievements />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="social-links" element={<AdminSocialLinks />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="messages" element={<AdminContactMessages />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="ads" element={<AdminAds />} />
        <Route path="crm-config" element={<AdminCrmConfig />} />
        <Route path="docs-config" element={<AdminDocsConfig />} />
        <Route path="youtube-config" element={<AdminYouTubeConfig />} />
        <Route path="ai-automation" element={<AdminAiAutomation />} />
        <Route path="payment-settings" element={<AdminPaymentSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  )
}
